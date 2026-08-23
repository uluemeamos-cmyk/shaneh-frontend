// main.js — talks to the backend API for trips/cars, and drives the
// shared booking modal that kicks off Stripe Checkout.

function formatMoney(cents, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "usd" }).format(
    (cents || 0) / 100
  );
}

// ---------- Load & render trips ----------
async function loadTrips() {
  const grid = document.getElementById("trips-grid");
  try {
    const res = await fetch(`${API_BASE_URL}/api/trips`);
    const trips = await res.json();
    if (!trips.length) {
      grid.innerHTML = `<div class="empty-state">No trips available right now.</div>`;
      return;
    }
    grid.innerHTML = trips.map(tripCardHTML).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load trips. Is the backend running? (${API_BASE_URL})</div>`;
  }
}

function tripCardHTML(trip) {
  return `
    <div class="card">
      <div class="card-media"><img src="${trip.image}" alt="${trip.title}" loading="lazy"><span class="tag">${trip.type}</span></div>
      <div class="card-body">
        <h3>${trip.title}</h3>
        <p>${trip.description}</p>
        <div class="card-price">
          <b>${formatMoney(trip.pricePerAdult, trip.currency)}</b>
          <span>per adult · ${trip.durationDays} days</span>
        </div>
        <button class="btn gold" data-book-trip="${trip.id}">Book &amp; Pay</button>
      </div>
    </div>`;
}

// ---------- Load & render car rentals ----------
async function loadCars() {
  const grid = document.getElementById("cars-grid");
  try {
    const res = await fetch(`${API_BASE_URL}/api/car-rentals`);
    const cars = await res.json();
    if (!cars.length) {
      grid.innerHTML = `<div class="empty-state">No cars available right now.</div>`;
      return;
    }
    grid.innerHTML = cars.map(carCardHTML).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load cars. Is the backend running? (${API_BASE_URL})</div>`;
  }
}

function carCardHTML(car) {
  return `
    <div class="card">
      <div class="card-media"><img src="${car.image}" alt="${car.name}" loading="lazy"><span class="tag">${car.seats} seats</span></div>
      <div class="card-body">
        <h3>${car.name}</h3>
        <p>${car.description}</p>
        <div class="card-price">
          <b>${formatMoney(car.pricePerDay, car.currency)}</b>
          <span>per day</span>
        </div>
        <button class="btn gold" data-book-car="${car.id}">Book &amp; Pay</button>
      </div>
    </div>`;
}

// ---------- Load & render hotels ----------
async function loadHotels() {
  const grid = document.getElementById("hotels-grid");
  try {
    const res = await fetch(`${API_BASE_URL}/api/hotels`);
    const hotels = await res.json();
    if (!hotels.length) {
      grid.innerHTML = `<div class="empty-state">No hotels available right now.</div>`;
      return;
    }
    grid.innerHTML = hotels.map(hotelCardHTML).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load hotels. Is the backend running? (${API_BASE_URL})</div>`;
  }
}

function hotelCardHTML(hotel) {
  return `
    <div class="card">
      <div class="card-media"><img src="${hotel.image}" alt="${hotel.name}" loading="lazy"><span class="tag">★ ${hotel.rating}</span></div>
      <div class="card-body">
        <h3>${hotel.name}</h3>
        <p>${hotel.location} — ${hotel.description}</p>
        <div class="card-price">
          <b>${formatMoney(hotel.pricePerNight, hotel.currency)}</b>
          <span>per night</span>
        </div>
        <button class="btn gold" data-book-hotel="${hotel.id}">Book &amp; Pay</button>
      </div>
    </div>`;
}

// ---------- Load & render airport pickups ----------
async function loadPickups() {
  const grid = document.getElementById("pickups-grid");
  try {
    const res = await fetch(`${API_BASE_URL}/api/airport-pickups`);
    const pickups = await res.json();
    if (!pickups.length) {
      grid.innerHTML = `<div class="empty-state">No transfers available right now.</div>`;
      return;
    }
    grid.innerHTML = pickups.map(pickupCardHTML).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Couldn't load transfers. Is the backend running? (${API_BASE_URL})</div>`;
  }
}

function pickupCardHTML(pickup) {
  return `
    <div class="card">
      <div class="card-media"><img src="${pickup.image}" alt="${pickup.name}" loading="lazy"><span class="tag">${pickup.seats} seats</span></div>
      <div class="card-body">
        <h3>${pickup.name}</h3>
        <p>${pickup.description}</p>
        <div class="card-price">
          <b>${formatMoney(pickup.price, pickup.currency)}</b>
          <span>per transfer</span>
        </div>
        <button class="btn gold" data-book-pickup="${pickup.id}">Book &amp; Pay</button>
      </div>
    </div>`;
}

// ---------- Booking modal ----------
const overlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalSub = document.getElementById("modal-sub");
const tripFields = document.getElementById("trip-fields");
const carFields = document.getElementById("car-fields");
const hotelFields = document.getElementById("hotel-fields");
const pickupFields = document.getElementById("pickup-fields");
const allFieldGroups = [tripFields, carFields, hotelFields, pickupFields];
const totalEl = document.getElementById("modal-total-amount");
const form = document.getElementById("booking-form");
const errorEl = document.getElementById("modal-error");
const submitBtn = document.getElementById("modal-submit");

let currentItem = null; // { kind: 'trip'|'car-rental', data: {...} }

let tripsCache = [];
let carsCache = [];
let hotelsCache = [];
let pickupsCache = [];

async function ensureCaches() {
  if (!tripsCache.length) {
    tripsCache = await fetch(`${API_BASE_URL}/api/trips`).then((r) => r.json()).catch(() => []);
  }
  if (!carsCache.length) {
    carsCache = await fetch(`${API_BASE_URL}/api/car-rentals`).then((r) => r.json()).catch(() => []);
  }
  if (!hotelsCache.length) {
    hotelsCache = await fetch(`${API_BASE_URL}/api/hotels`).then((r) => r.json()).catch(() => []);
  }
  if (!pickupsCache.length) {
    pickupsCache = await fetch(`${API_BASE_URL}/api/airport-pickups`).then((r) => r.json()).catch(() => []);
  }
}

function openModal() {
  overlay.classList.add("open");
  errorEl.classList.remove("show");
}
function closeModal() {
  overlay.classList.remove("open");
  form.reset();
  currentItem = null;
}

document.getElementById("modal-close").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

function recalcTotal() {
  if (!currentItem) return;
  if (currentItem.kind === "trip") {
    const adults = Math.max(1, parseInt(document.getElementById("f-adults").value, 10) || 1);
    const children = Math.max(0, parseInt(document.getElementById("f-children").value, 10) || 0);
    const total = currentItem.data.pricePerAdult * adults + currentItem.data.pricePerChild * children;
    totalEl.textContent = formatMoney(total, currentItem.data.currency);
  } else if (currentItem.kind === "car-rental") {
    const days = Math.max(1, parseInt(document.getElementById("f-days").value, 10) || 1);
    const total = currentItem.data.pricePerDay * days;
    totalEl.textContent = formatMoney(total, currentItem.data.currency);
  } else if (currentItem.kind === "hotel") {
    const nights = Math.max(1, parseInt(document.getElementById("f-nights").value, 10) || 1);
    const total = currentItem.data.pricePerNight * nights;
    totalEl.textContent = formatMoney(total, currentItem.data.currency);
  } else if (currentItem.kind === "airport-pickup") {
    totalEl.textContent = formatMoney(currentItem.data.price, currentItem.data.currency);
  }
}

["f-adults", "f-children", "f-days", "f-nights"].forEach((id) => {
  document.getElementById(id).addEventListener("input", recalcTotal);
});

function hideAllFieldGroups() {
  allFieldGroups.forEach((el) => (el.style.display = "none"));
}

async function openTripModal(tripId) {
  await ensureCaches();
  const trip = tripsCache.find((t) => t.id === tripId);
  if (!trip) return;
  currentItem = { kind: "trip", data: trip };
  modalTitle.textContent = trip.title;
  modalSub.textContent = `${trip.durationDays}-day trip package`;
  hideAllFieldGroups();
  tripFields.style.display = "block";
  document.getElementById("f-adults").value = 1;
  document.getElementById("f-children").value = 0;
  recalcTotal();
  openModal();
}

async function openCarModal(carId) {
  await ensureCaches();
  const car = carsCache.find((c) => c.id === carId);
  if (!car) return;
  currentItem = { kind: "car-rental", data: car };
  modalTitle.textContent = car.name;
  modalSub.textContent = `${car.seats}-seat rental car`;
  hideAllFieldGroups();
  carFields.style.display = "block";
  document.getElementById("f-days").value = 1;
  recalcTotal();
  openModal();
}

async function openHotelModal(hotelId) {
  await ensureCaches();
  const hotel = hotelsCache.find((h) => h.id === hotelId);
  if (!hotel) return;
  currentItem = { kind: "hotel", data: hotel };
  modalTitle.textContent = hotel.name;
  modalSub.textContent = hotel.location;
  hideAllFieldGroups();
  hotelFields.style.display = "block";
  document.getElementById("f-nights").value = 1;
  recalcTotal();
  openModal();
}

async function openPickupModal(pickupId) {
  await ensureCaches();
  const pickup = pickupsCache.find((p) => p.id === pickupId);
  if (!pickup) return;
  currentItem = { kind: "airport-pickup", data: pickup };
  modalTitle.textContent = pickup.name;
  modalSub.textContent = "Airport transfer";
  hideAllFieldGroups();
  pickupFields.style.display = "block";
  recalcTotal();
  openModal();
}

document.addEventListener("click", (e) => {
  const tripBtn = e.target.closest("[data-book-trip]");
  const carBtn = e.target.closest("[data-book-car]");
  const hotelBtn = e.target.closest("[data-book-hotel]");
  const pickupBtn = e.target.closest("[data-book-pickup]");
  if (tripBtn) openTripModal(tripBtn.getAttribute("data-book-trip"));
  if (carBtn) openCarModal(carBtn.getAttribute("data-book-car"));
  if (hotelBtn) openHotelModal(hotelBtn.getAttribute("data-book-hotel"));
  if (pickupBtn) openPickupModal(pickupBtn.getAttribute("data-book-pickup"));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentItem) return;
  errorEl.classList.remove("show");
  submitBtn.disabled = true;
  submitBtn.textContent = "Redirecting to payment…";

  const customerName = document.getElementById("f-name").value.trim();
  const customerEmail = document.getElementById("f-email").value.trim();
  const customerPhone = document.getElementById("f-phone").value.trim();

  try {
    let endpoint, payload;
    if (currentItem.kind === "trip") {
      endpoint = "/api/checkout/trip";
      payload = {
        tripId: currentItem.data.id,
        adults: document.getElementById("f-adults").value,
        children: document.getElementById("f-children").value,
        startDate: document.getElementById("f-start-date").value,
        customerName,
        customerEmail,
        customerPhone,
      };
    } else if (currentItem.kind === "car-rental") {
      endpoint = "/api/checkout/car-rental";
      payload = {
        carId: currentItem.data.id,
        days: document.getElementById("f-days").value,
        pickupDate: document.getElementById("f-pickup-date").value,
        customerName,
        customerEmail,
        customerPhone,
      };
    } else if (currentItem.kind === "hotel") {
      endpoint = "/api/checkout/hotel";
      payload = {
        hotelId: currentItem.data.id,
        nights: document.getElementById("f-nights").value,
        checkInDate: document.getElementById("f-checkin-date").value,
        customerName,
        customerEmail,
        customerPhone,
      };
    } else if (currentItem.kind === "airport-pickup") {
      endpoint = "/api/checkout/airport-pickup";
      payload = {
        pickupId: currentItem.data.id,
        arrivalDate: document.getElementById("f-arrival-date").value,
        flightNumber: document.getElementById("f-flight-number").value,
        customerName,
        customerEmail,
        customerPhone,
      };
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Checkout request failed");
    const data = await res.json();
    if (!data.url) throw new Error("No checkout URL returned");

    window.location.href = data.url; // Stripe Checkout
  } catch (err) {
    errorEl.textContent = "Couldn't start checkout. Please try again.";
    errorEl.classList.add("show");
    submitBtn.disabled = false;
    submitBtn.textContent = "Continue to payment";
  }
});

// Quick search bar just scrolls to trips (a fuller search/filter can be
// wired to GET /api/trips?type=... later).
document.getElementById("quick-search").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("qs-type").value;
  document.getElementById("trips").scrollIntoView({ behavior: "smooth" });
  if (type) {
    fetch(`${API_BASE_URL}/api/trips?type=${encodeURIComponent(type)}`)
      .then((r) => r.json())
      .then((trips) => {
        document.getElementById("trips-grid").innerHTML =
          trips.map(tripCardHTML).join("") ||
          `<div class="empty-state">No trips match that filter.</div>`;
      });
  }
});

loadTrips();
loadCars();
loadHotels();
loadPickups();
