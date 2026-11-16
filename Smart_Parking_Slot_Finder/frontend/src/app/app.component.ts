import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as L from 'leaflet';

type VehicleType = 'bike' | 'car' | 'auto';

type VehicleSlot = {
  total: number;
  available: number;
};

type Parking = {
  _id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;

  vehicleSlots: {
    bike: VehicleSlot;
    car: VehicleSlot;
    auto: VehicleSlot;
  };
};

type Booking = {
  _id: string;
  slotNumber: number;
  vehicleType: VehicleType;
  status: string;
  bookingDate: string;
  parking?: Parking;
};

const API = 'http://localhost:5000/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements AfterViewInit {

  @ViewChild('mapHost') mapHost?: ElementRef<HTMLDivElement>;
  @ViewChild('streetHost') streetHost?: ElementRef<HTMLDivElement>;

  mode: 'home' | 'user' | 'admin' = 'home';

  authMode: 'user-login' | 'register' | 'admin-login' = 'user-login';

  authOpen = false;

  token = localStorage.getItem('sp_token') || '';
  role = localStorage.getItem('sp_role') || '';
  profileName = localStorage.getItem('sp_name') || '';

  form: any = {
    name: '',
    email: '',
    password: '',
    username: ''
  };

  // ADMIN PARKING FORM

  parkingForm: any = {
    name: '',
    address: '',
    latitude: 17.3850,
    longitude: 78.4867,

    vehicleSlots: {
      bike: { total: 0, available: 0 },
      car: { total: 0, available: 0 },
      auto: { total: 0, available: 0 }
    }
  };

  locations: Parking[] = [];
  bookings: Booking[] = [];
  allBookings: any[] = [];
  stats: any = {};

  selected?: Parking;
  search = '';

  // USER VEHICLE SELECTION

  selectedVehicleType: VehicleType = 'car';

  message = '';
  error = '';

  map?: L.Map;
  markers: L.CircleMarker[] = [];
  routeLine?: L.Polyline;

  myLocationMarker?: L.CircleMarker;

  editingId = '';

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    if (this.token) {
      this.enterDashboard();
    }
  }

  headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });
  }

  notify(msg: string, bad = false) {
    this.message = bad ? '' : msg;
    this.error = bad ? msg : '';
  }

  openAuth(kind: 'user-login' | 'register' | 'admin-login') {
    this.authMode = kind;
    this.authOpen = true;
    this.mode = 'home';
    this.notify('');
  }

  // LOGIN AND REGISTRATION

  submitAuth() {
    const path =
      this.authMode === 'register'
        ? '/auth/register'
        : this.authMode === 'admin-login'
        ? '/auth/admin/login'
        : '/auth/user/login';

    this.http.post<any>(API + path, this.form).subscribe({
      next: r => {
        this.token = r.token;
        this.role = r.role;
        this.profileName = r.profile.name || r.profile.username;

        localStorage.setItem('sp_token', this.token);
        localStorage.setItem('sp_role', this.role);
        localStorage.setItem('sp_name', this.profileName);

        this.authOpen = false;
        this.enterDashboard();
      },

      error: e => this.notify(
        e.error?.message || 'Authentication failed',
        true
      )
    });
  }

  logout() {
    this.token = '';
    this.role = '';
    this.profileName = '';

    localStorage.clear();

    this.mode = 'home';
    this.notify('You have logged out.');
  }

  // DASHBOARD

  enterDashboard() {
    this.mode = this.role === 'admin' ? 'admin' : 'user';

    this.loadLocations();

    if (this.role === 'user') {
      this.loadMyBookings();
    } else {
      this.loadStats();
      this.loadAllBookings();
    }

    setTimeout(() => this.initMap(), 300);
  }

  // LOAD PARKING LOCATIONS

  loadLocations() {
    this.http.get<Parking[]>(API + '/parking').subscribe({
      next: r => {
        this.locations = r;

        if (this.selected) {
          this.selected = this.locations.find(
            x => x._id === this.selected!._id
          );
        }

        this.refreshMarkers();
      },

      error: e => this.notify(
        e.error?.message || 'Could not load parking locations',
        true
      )
    });
  }

  // USER BOOKINGS

  loadMyBookings() {
    this.http.get<Booking[]>(API + '/bookings/my', {
      headers: this.headers()
    }).subscribe({
      next: r => this.bookings = r,

      error: e => this.notify(
        e.error?.message || 'Could not load bookings',
        true
      )
    });
  }

  // ADMIN BOOKINGS

  loadAllBookings() {
    this.http.get<any[]>(API + '/bookings', {
      headers: this.headers()
    }).subscribe({
      next: r => this.allBookings = r,

      error: e => this.notify(
        e.error?.message || 'Could not load bookings',
        true
      )
    });
  }

  // ADMIN STATISTICS

  loadStats() {
    this.http.get<any>(API + '/admin/stats', {
      headers: this.headers()
    }).subscribe({
      next: r => this.stats = r,

      error: e => this.notify(
        e.error?.message || 'Could not load stats',
        true
      )
    });
  }

  // SEARCH PARKING

  get filtered() {
    const q = this.search.toLowerCase();

    return this.locations.filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  }

  // SELECT PARKING LOCATION

  select(p: Parking) {
    this.selected = p;

    if (this.map) {
      this.map.setView([p.latitude, p.longitude], 16);
    }
  }

  // GET AVAILABLE SLOTS FOR SELECTED VEHICLE

  getAvailableSlots(p: Parking): number {
    return p.vehicleSlots?.[this.selectedVehicleType]?.available ?? 0;
  }

  getTotalSlots(p: Parking): number {
    return p.vehicleSlots?.[this.selectedVehicleType]?.total ?? 0;
  }

  // USER BOOKING

  book(p: Parking) {

    const available = this.getAvailableSlots(p);

    if (available <= 0) {
      this.notify(
        `No ${this.selectedVehicleType} slots available here.`,
        true
      );
      return;
    }

    this.http.post<any>(
      API + '/bookings',
      {
        parkingId: p._id,
        vehicleType: this.selectedVehicleType
      },
      {
        headers: this.headers()
      }
    ).subscribe({
      next: r => {
        this.notify(
          `${this.selectedVehicleType.toUpperCase()} booked successfully! Your slot number is ${r.booking.slotNumber}.`
        );

        this.loadLocations();
        this.loadMyBookings();
      },

      error: e => this.notify(
        e.error?.message || 'Booking failed',
        true
      )
    });
  }

  // CANCEL BOOKING

  cancel(b: Booking) {
    this.http.patch(
      API + `/bookings/${b._id}/cancel`,
      {},
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        this.notify(
          'Booking cancelled. Availability has been restored.'
        );

        this.loadLocations();
        this.loadMyBookings();
      },

      error: e => this.notify(
        e.error?.message || 'Cancellation failed',
        true
      )
    });
  }

  // ADMIN ADD OR UPDATE PARKING

  saveParking() {

    const req = this.editingId
      ? this.http.put<Parking>(
          API + `/parking/${this.editingId}`,
          this.parkingForm,
          { headers: this.headers() }
        )
      : this.http.post<Parking>(
          API + '/parking',
          this.parkingForm,
          { headers: this.headers() }
        );

    req.subscribe({
      next: () => {
        this.notify(
          this.editingId
            ? 'Parking updated'
            : 'Parking location added'
        );

        this.editingId = '';

        this.parkingForm = {
          name: '',
          address: '',
          latitude: 17.3850,
          longitude: 78.4867,

          vehicleSlots: {
            bike: { total: 0, available: 0 },
            car: { total: 0, available: 0 },
            auto: { total: 0, available: 0 }
          }
        };

        this.loadLocations();
        this.loadStats();
      },

      error: e => this.notify(
        e.error?.message || 'Could not save parking',
        true
      )
    });
  }

  // ADMIN EDIT PARKING

  editParking(p: Parking) {
    this.editingId = p._id;

    this.parkingForm = {
      name: p.name,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,

      vehicleSlots: {
        bike: {
          total: p.vehicleSlots?.bike?.total ?? 0,
          available: p.vehicleSlots?.bike?.available ?? 0
        },

        car: {
          total: p.vehicleSlots?.car?.total ?? 0,
          available: p.vehicleSlots?.car?.available ?? 0
        },

        auto: {
          total: p.vehicleSlots?.auto?.total ?? 0,
          available: p.vehicleSlots?.auto?.available ?? 0
        }
      }
    };

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // ADMIN DELETE PARKING

  deleteParking(p: Parking) {
    if (!confirm(`Delete ${p.name}?`)) return;

    this.http.delete(
      API + `/parking/${p._id}`,
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        this.notify('Location deleted');

        this.loadLocations();
        this.loadStats();
      },

      error: e => this.notify(
        e.error?.message || 'Could not delete location',
        true
      )
    });
  }

  // INITIALIZE OPENSTREETMAP

  initMap() {
    if (!this.mapHost) return;

    if (!this.map) {
      this.map = L.map(
        this.mapHost.nativeElement
      ).setView([17.385, 78.4867], 12);

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(this.map);
    }

    this.refreshMarkers();

    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  // PARKING MAP MARKERS

  refreshMarkers() {
    if (!this.map) return;

    this.markers.forEach(m => m.remove());
    this.markers = [];

    this.locations.forEach(p => {

      const bikeAvailable =
        p.vehicleSlots?.bike?.available ?? 0;

      const carAvailable =
        p.vehicleSlots?.car?.available ?? 0;

      const autoAvailable =
        p.vehicleSlots?.auto?.available ?? 0;

      const totalAvailable =
        bikeAvailable + carAvailable + autoAvailable;

      const marker = L.circleMarker(
        [p.latitude, p.longitude],
        {
          radius: 9,
          color: '#fff',
          weight: 2,

          fillColor:
            totalAvailable > 0
              ? '#16a36a'
              : '#e04444',

          fillOpacity: 1
        }
      ).addTo(this.map!);

      marker.bindPopup(
        `<strong>${this.escapeHtml(p.name)}</strong><br>` +
        `Bike: ${bikeAvailable} available<br>` +
        `Car: ${carAvailable} available<br>` +
        `Auto: ${autoAvailable} available`
      );

      marker.on('click', () => this.select(p));

      this.markers.push(marker);
    });
  }

  // ESCAPE HTML

  escapeHtml(value: string) {
    return value.replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c] || c)
    );
  }

  // BLUE ROUTE TO PARKING

  async directionsToSelected() {
    if (!this.selected || !this.map) return;

    if (!navigator.geolocation) {
      this.notify(
        'Geolocation is not supported by this browser.',
        true
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {

        const origin =
          `${pos.coords.longitude},${pos.coords.latitude}`;

        const destination =
          `${this.selected!.longitude},${this.selected!.latitude}`;

        const url =
          `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=geojson`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.code !== 'Ok' || !data.routes?.length) {
            throw new Error(
              'No driving route found for this location.'
            );
          }

          const route = data.routes[0];

          const points = route.geometry.coordinates.map(
            (c: number[]) =>
              [c[1], c[0]] as L.LatLngExpression
          );

          this.routeLine?.remove();

          this.routeLine = L.polyline(
            points,
            {
              color: '#1769ff',
              weight: 6,
              opacity: 0.9
            }
          ).addTo(this.map!);

          this.map!.fitBounds(
            this.routeLine.getBounds(),
            { padding: [35, 35] }
          );

          this.notify(
            `Driving route: ${(route.distance / 1000).toFixed(1)} km · about ${Math.round(route.duration / 60)} min`
          );

        } catch (e: any) {
          this.notify(
            e.message || 'Could not calculate route.',
            true
          );
        }
      },

      () => this.notify(
        'Allow location access in your browser to get directions.',
        true
      )
    );
  }

  // STREET-LEVEL IMAGERY

  toggleStreetView() {
    if (!this.selected) return;

    const url =
      `https://www.mapillary.com/app/?lat=${this.selected.latitude}&lng=${this.selected.longitude}&z=17`;

    window.open(url, '_blank', 'noopener');

    this.notify(
      'Opened Mapillary imagery search. Street-level coverage varies by area.'
    );
  }

  // SHOW CURRENT USER LOCATION WITH BLUE DOT

  locateMe() {
    if (!navigator.geolocation) {
      this.notify(
        'Geolocation is not supported by this browser.',
        true
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (!this.map) return;

        this.map.setView([lat, lng], 17);

        this.myLocationMarker?.remove();

        this.myLocationMarker = L.circleMarker(
          [lat, lng],
          {
            radius: 9,
            color: '#ffffff',
            weight: 3,
            fillColor: '#1677ff',
            fillOpacity: 1
          }
        ).addTo(this.map);

        this.myLocationMarker
          .bindPopup('You are here 📍')
          .openPopup();

        this.notify('Your current location is displayed!');
      },

      error => {
        if (error.code === error.PERMISSION_DENIED) {
          this.notify(
            'Location permission denied. Allow location access in your browser.',
            true
          );
        } else if (error.code === error.TIMEOUT) {
          this.notify(
            'Location request timed out. Please try again.',
            true
          );
        } else {
          this.notify(
            'Unable to determine your current location.',
            true
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  get mapsReady() {
    return !!this.map;
  }
}