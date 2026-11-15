/* ============================================================
   HOTEL SUIZA — Sistema completo
   ============================================================ */

function migrateStorageKey(storage, oldKey, newKey) {
  const oldValue = storage.getItem(oldKey);
  if (storage.getItem(newKey) === null && oldValue !== null) {
    storage.setItem(newKey, oldValue);
  }
  storage.removeItem(oldKey);
}

[
  ["aurea_users_db", "suiza_users_db"],
  ["aurea_user_session", "suiza_user_session"],
  ["aurea_reservations_v1", "suiza_reservations_v1"],
  ["aurea_admin_activity_v1", "suiza_admin_activity_v1"]
].forEach(([oldKey, newKey]) => migrateStorageKey(localStorage, oldKey, newKey));

[
  ["aurea_admin_session_v2", "suiza_admin_session_v2"],
  ["aurea_admin_username", "suiza_admin_username"]
].forEach(([oldKey, newKey]) => migrateStorageKey(sessionStorage, oldKey, newKey));

/* ============================================================
   CONFIG: Números físicos de habitación por categoría
   ============================================================ */
const ROOM_NUMBERING = {
  "Habitación Simple": ["101", "102", "103", "104"],
  "Habitación Doble":  ["201", "202", "203", "204", "205"],
  "Deluxe Premium":    ["301", "302", "303", "304"],
  "Suite Suiza":       ["401", "402", "403", "404", "405", "406"]
};

// ---------- ELEMENTOS PRINCIPALES ----------
const menuToggle    = document.getElementById("menuToggle");
const mainNav       = document.getElementById("mainNav");
const toast         = document.getElementById("toast");
const roomModal     = document.getElementById("roomModal");
const supabaseForm  = document.getElementById("supabaseForm");

// ---------- MENÚ RESPONSIVE ----------
menuToggle.addEventListener("click", () => {
  const abierto = mainNav.classList.toggle("open");
  menuToggle.textContent = abierto ? "×" : "☰";
});

mainNav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.textContent = "☰";
  });
});


// ---------- NOTIFICACIONES ----------
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 4000);
}

const appDialog          = document.getElementById("appDialog");
const appDialogTitle     = document.getElementById("appDialogTitle");
const appDialogMessage   = document.getElementById("appDialogMessage");
const appDialogCancel    = document.getElementById("appDialogCancel");
const appDialogConfirm   = document.getElementById("appDialogConfirm");
let appDialogResolver    = null;
let appDialogPreviousFocus = null;
let appDialogPreviousOverflow = "";

function showAppDialog({ title, message, confirmText = "Aceptar", cancelText = "", danger = false }) {
  if (appDialogResolver) closeAppDialog(false);

  return new Promise(resolve => {
    appDialogResolver = resolve;
    appDialogPreviousFocus = document.activeElement;
    appDialogPreviousOverflow = document.body.style.overflow;
    appDialogTitle.textContent = title;
    appDialogMessage.textContent = message;
    appDialogConfirm.textContent = confirmText;
    appDialogConfirm.classList.toggle("danger", danger);
    appDialogCancel.textContent = cancelText || "Cancelar";
    appDialogCancel.hidden = !cancelText;
    appDialog.hidden = false;
    document.body.style.overflow = "hidden";
    appDialogConfirm.focus();
  });
}

function closeAppDialog(confirmed) {
  if (appDialog.hidden) return;
  appDialog.hidden = true;
  document.body.style.overflow = appDialogPreviousOverflow;
  const resolve = appDialogResolver;
  appDialogResolver = null;
  if (appDialogPreviousFocus instanceof HTMLElement) appDialogPreviousFocus.focus();
  if (resolve) resolve(confirmed);
}

appDialogConfirm.addEventListener("click", () => closeAppDialog(true));
appDialogCancel.addEventListener("click", () => closeAppDialog(false));
appDialog.addEventListener("click", event => {
  if (event.target === appDialog) closeAppDialog(false);
});
window.addEventListener("keydown", event => {
  if (appDialog.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeAppDialog(false);
  } else if (event.key === "Tab") {
    const buttons = [appDialogCancel, appDialogConfirm].filter(button => !button.hidden);
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});


// ---------- PESTAÑAS DE HABITACIONES ----------
const tabs = document.querySelectorAll(".filter-btn");
let rooms = document.querySelectorAll(".room-card");


// ---------- INFORMACIÓN DE HABITACIONES ----------
const roomDetails = {
  "Habitación Simple": {
    descripcion: "Un ambiente cálido y funcional, ideal para descansar después de un día de actividades. Incluye cama confortable, baño privado, aire acondicionado, conexión Wi-Fi y detalles de cortesía."
  },
  "Habitación Doble": {
    descripcion: "Disfruta de una estancia cómoda para compartir. Cuenta con dos camas, baño privado, aire acondicionado, conexión Wi-Fi y algunas comodidades adicionales."
  },
  "Deluxe Premium": {
    descripcion: "Una habitación amplia y confortable, con cama queen, baño privado y comodidades adicionales para una estadía más práctica."
  },
  "Suite Suiza": {
    descripcion: "Una estadía con mayor espacio y comodidad, con cama king y sala independiente para descansar y relajarse."
  }
};

// 🔥 Estos precios e imágenes son el respaldo inicial, pero se actualizarán desde Supabase
let ROOM_PRICES = {
  "Habitación Simple": 180,
  "Habitación Doble": 260,
  "Deluxe Premium": 340,
  "Suite Suiza": 490
};

let ROOM_IMAGES = {
  "Habitación Simple": [ "img/simple/simple-1.jpg", "img/simple/simple-2.jpg", "img/simple/simple-3.jpg", "img/simple/simple-4.jpg"],
  "Habitación Doble":  ["img/doble/doble-1.jpg", "img/doble/doble-2.jpg", "img/doble/doble-3.jpg", "img/doble/doble-4.jpg"],
  "Deluxe Premium":    ["img/deluxe/deluxe-1.jpg", "img/deluxe/deluxe-2.jpg", "img/deluxe/deluxe-3.jpg", "img/deluxe/deluxe-4.jpg"],
  "Suite Suiza":       [ "img/suite/suite-1.jpg", "img/suite/suite-2.jpg", "img/suite/suite-3.jpg", "img/suite/suite-4.jpg"]
};

const ROOM_COUNTS = { simple: 4, doble: 5, deluxe: 4, suite: 6 };
const ROOM_INVENTORY = {
  "Habitación Simple": 4,
  "Habitación Doble": 5,
  "Deluxe Premium": 4,
  "Suite Suiza": 6
};
const ROOM_LABELS = {
  simple: "SIMPLE",
  doble: "DOBLE",
  deluxe: "DELUXE",
  suite: "SUITE"
};

// ============================================================
// 🔥 NUEVA FUNCIÓN: Renderiza las tarjetas desde la data de Supabase
// ============================================================
function renderizarTarjetasHabitaciones() {
  const roomGrid = document.getElementById("roomGrid");
  if (!roomGrid) return;

  // 1. Guardamos el molde original de la primera tarjeta
  const templateOriginal = roomGrid.querySelector(".room-card");
  if (!templateOriginal) return;
  const htmlMolde = templateOriginal.outerHTML;
  
  // 2. Vaciamos la grilla para no duplicar
  roomGrid.innerHTML = ""; 

  const NOMBRES_CATEGORIAS = {
    simple: "Habitación Simple",
    doble: "Habitación Doble",
    deluxe: "Deluxe Premium",
    suite: "Suite Suiza"
  };

  // 3. Creamos las tarjetas según la cantidad (ROOM_COUNTS)
  Object.entries(ROOM_COUNTS).forEach(([categoriaKey, cantidad]) => {
    const nombreCat = NOMBRES_CATEGORIAS[categoriaKey];
    
    for (let i = 1; i <= cantidad; i++) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlMolde;
      const nuevaTarjeta = tempDiv.firstElementChild;
      
      nuevaTarjeta.dataset.category = categoriaKey;
      nuevaTarjeta.dataset.roomNumber = String(i).padStart(2, "0");
      
      // 🔥 SOLUCIÓN 1: Actualizar el título de la tarjeta para que coincida con la categoría
      const h3 = nuevaTarjeta.querySelector("h3");
      if (h3) h3.textContent = nombreCat;

      // 🔥 SOLUCIÓN 2: Actualizar el precio mostrado en la tarjeta
      const strongPrecio = nuevaTarjeta.querySelector(".room-title strong");
      if (strongPrecio && ROOM_PRICES[nombreCat]) {
        strongPrecio.innerHTML = `S/ ${ROOM_PRICES[nombreCat]} <small>/ noche</small>`;
      }

      // 🔥 SOLUCIÓN 3: Volver a asignar los eventos de clic a las tarjetas nuevas
      const roomLink = nuevaTarjeta.querySelector(".room-link");
      if (roomLink) {
        roomLink.addEventListener("click", () => openPreview(nombreCat));
      }

      const viewImage = nuevaTarjeta.querySelector(".view-image");
      if (viewImage) {
        viewImage.addEventListener("click", () => openPreview(nombreCat));
      }

      const roomNumberSpan = nuevaTarjeta.querySelector(".room-number");
      if (roomNumberSpan) {
        roomNumberSpan.textContent = `${ROOM_LABELS[categoriaKey]} ${nuevaTarjeta.dataset.roomNumber}`;
      }
      roomGrid.appendChild(nuevaTarjeta);
    }
  });

  rooms = document.querySelectorAll(".room-card");

  // 4. Aplicamos el número físico (Badge)
  Object.entries(ROOM_NUMBERING).forEach(([roomName, numbers]) => {
    const cards = [...document.querySelectorAll(".room-card")]
      .filter(card => card.querySelector("h3").textContent === roomName);

    cards.forEach((card, index) => {
      const physical = numbers[index] || "";
      card.dataset.physicalRoom = physical;
      const imageWrap = card.querySelector(".room-image");
      if (imageWrap && !imageWrap.querySelector(".room-number-badge")) {
        const badge = document.createElement("span");
        badge.className = "room-number-badge";
        badge.textContent = physical ? `N° ${physical}` : "N° —";
        imageWrap.appendChild(badge);
      }
    });
  });

  // 5. Aplicamos las imágenes actualizadas de Supabase
  document.querySelectorAll(".room-card").forEach(card => {
    const nombre = card.querySelector("h3").textContent;
    const img = card.querySelector(".room-image img");
    if (ROOM_IMAGES[nombre] && img) {
      const imageIndex = (Number(card.dataset.roomNumber) - 1) % ROOM_IMAGES[nombre].length;
      img.src = ROOM_IMAGES[nombre][imageIndex];
      img.alt = nombre;
    }
  });

  // 6. Mantenemos la pestaña activa
  const activeTab = document.querySelector(".filter-btn.active");
  if(activeTab) showRoomCategory(activeTab.dataset.target);

  // 7. Actualizamos flechas del carrusel
  if (typeof updateCarouselArrows === "function") updateCarouselArrows();
}

// ============================================================
// 🔥 FUNCIÓN: Trae los datos de Spring Boot / Supabase
// y actualiza precios, cantidades, números, imágenes y menús
// ============================================================
async function sincronizarHabitacionesDesdeBackend() {
  try {
    const respuesta = await fetch("https://hotelsuiza.onrender.com/api/habitaciones");
    if (!respuesta.ok) throw new Error("Error al obtener habitaciones");

    const habitaciones = await respuesta.json();

    // Mapeo para saber a qué llave de ROOM_COUNTS corresponde cada tipo
    const mapeoCategorias = {
      "Habitación Simple": "simple",
      "Habitación Doble": "doble",
      "Deluxe Premium": "deluxe",
      "Suite Suiza": "suite"
    };

    habitaciones.forEach(hab => {
      const tipo = hab.tipo; // El nombre en tu base de datos

      if (tipo) {
        // 1. Actualizamos precio
        if (hab.precio) {
          ROOM_PRICES[tipo] = hab.precio;
        }

        // 2. Actualizamos imagen de portada
        if (hab.imagenUrl || hab.imagen_url) {
          if (!ROOM_IMAGES[tipo]) ROOM_IMAGES[tipo] = [];
          ROOM_IMAGES[tipo][0] = hab.imagenUrl || hab.imagen_url;
        }

        // 3. Actualizamos cantidad de habitaciones
        if (hab.cantidad) {
          const catKey = mapeoCategorias[tipo];
          if (catKey) {
            ROOM_COUNTS[catKey] = hab.cantidad;
            ROOM_INVENTORY[tipo] = hab.cantidad;
          }
        }

        // 4. Actualizamos los números físicos
        if (hab.numeros) {
          const numsArray = typeof hab.numeros === 'string' ? JSON.parse(hab.numeros) : hab.numeros;
          ROOM_NUMBERING[tipo] = numsArray;
        }
      }
    });

    console.log("✅ Precios, cantidades, números e imágenes actualizados desde Supabase");

    // 5. Actualizamos los menús desplegables
    const selects = [
      document.getElementById("resRoom"),
      document.getElementById("rRoom")
    ];
    selects.forEach(select => {
      if (!select) return;
      Array.from(select.options).forEach(option => {
        const roomType = option.value;
        if (ROOM_PRICES[roomType]) {
          option.textContent = `${roomType} - S/ ${ROOM_PRICES[roomType]}/noche`;
        }
      });
    });

    // 6. Mandamos a pintar las tarjetas con los datos frescos
    renderizarTarjetasHabitaciones();

  } catch (error) {
    console.error("❌ Error al sincronizar habitaciones:", error);
    // Si falla, renderizamos con los datos por defecto
    renderizarTarjetasHabitaciones();
  }
}

// Galería del modal
function renderModalGallery(nombre) {
  const imgs   = ROOM_IMAGES[nombre] || [];
  const main   = document.getElementById("modalImage");
  const thumbs = document.getElementById("modalThumbs");

  main.src = imgs[0] || "";
  main.alt = nombre;

  thumbs.innerHTML = imgs.map((src, i) => `
    <button type="button" class="thumb ${i === 0 ? "active" : ""}" data-src="${src}">
      <img src="${src}" alt="${nombre} ${i + 1}">
    </button>
  `).join("");

  thumbs.querySelectorAll(".thumb").forEach(btn => {
    btn.addEventListener("click", () => {
      main.src = btn.dataset.src;
      thumbs.querySelectorAll(".thumb").forEach(t => t.classList.toggle("active", t === btn));
    });
  });
}

// CAPACIDAD DE CADA HABITACIÓN
const ROOM_CAPACITY = {
  "Habitación Simple": { min: 1, max: 2 },
  "Habitación Doble": { min: 2, max: 3 },
  "Deluxe Premium": { min: 2, max: 2 },
  "Suite Suiza": { min: 2, max: 4 }
};

// Comodidades
const ROOM_AMENITIES = {
  "Habitación Simple": [
    "Aire acondicionado", "Secador de cabello", "Ventilador de techo", "TV por cable", "WiFi gratis",
    "Baño privado", "Agua de cortesía", "Limpieza diaria"
  ],
  "Habitación Doble": [
    "Aire acondicionado", "Secador de cabello", "Ventilador de techo", "TV por cable", "WiFi gratis",
    "Baño privado", "Agua de cortesía", "Limpieza diaria",
    "Mini bar", "Desayuno incluido"
  ],
  "Deluxe Premium": [
    "Aire acondicionado", "Secador de cabello", "Ventilador de techo", "TV por cable", "WiFi gratis",
    "Baño privado", "Agua de cortesía", "Limpieza diaria",
    "Mini bar", "Desayuno incluido",
    "Escritorio", "Artículos de baño de cortesía"
  ],
  "Suite Suiza": [
    "Aire acondicionado", "Secador de cabello", "Ventilador de techo", "TV por cable", "WiFi gratis",
    "Baño privado", "Agua de cortesía", "Limpieza diaria",
    "Mini bar", "Desayuno incluido",
    "Escritorio", "Artículos de baño de cortesía",
    "Sala independiente", "Cama king"
  ]
};

// Iconos para comodidades
const AMENITY_ICONS = {
  "Aire acondicionado": "❄",
  "Secador de cabello": "💨",
  "Ventilador de techo": "🌀",
  "Mini bar": "🍷",
  "TV por cable": "📺",
  "WiFi gratis": "📶",
  "Baño privado": "🚿",
  "Agua de cortesía": "💧",
  "Limpieza diaria": "🧹",
  "Desayuno incluido": "🍽",
  "Escritorio": "🖥",
  "Artículos de baño de cortesía": "🧴",
  "Sala independiente": "🛋",
  "Cama king": "🛏"
};

let currentRoom = null;

function openRoom(button) {
  const card   = button.closest(".room-card");
  const nombre = card.querySelector("h3").textContent;

  currentRoom = nombre;

  document.getElementById("modalTitle").textContent = nombre;
  document.getElementById("modalDescription").textContent = roomDetails[nombre].descripcion;

  renderModalGallery(nombre);
  renderAmenities(nombre);

  roomModal.classList.add("open");
  roomModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  roomModal.classList.remove("open");
  roomModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close]").forEach(el => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});


// ---------- FECHAS Y CAPACIDAD (FORMULARIO) ----------
function computeTodayLocalISO() {
  const t = new Date();
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

let localDate = computeTodayLocalISO();

const resCheckin = document.getElementById("resCheckin");
const resCheckout = document.getElementById("resCheckout");
const resRoomSelect = document.getElementById("resRoom");
const resTotalPrice = document.getElementById("resTotalPrice");
const resGuestsSelect = document.getElementById("resGuests");
const resRoomAvailability = document.getElementById("resRoomAvailability");
const availabilityCalendarGrid = document.getElementById("availabilityCalendarGrid");
const availabilityCalendarMonth = document.getElementById("availabilityCalendarMonth");
const availabilityCalendarRoom = document.getElementById("availabilityCalendarRoom");
const availabilityCalendarHint = document.getElementById("availabilityCalendarHint");
const availabilityFilterSummary = document.getElementById("availabilityFilterSummary");
const availabilityCalendar = document.getElementById("availabilityCalendar");
const availabilityToggle = document.getElementById("availabilityToggle");
let availabilityCalendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function refreshLocalDate() {
  localDate = computeTodayLocalISO();
  if (resCheckin) resCheckin.min = localDate;
  if (resCheckout) resCheckout.min = resCheckin?.value || localDate;
}

function toLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 🔥 Helper para formatear fechas para Java (LocalDateTime)
function formatearFechaJava(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  } catch (e) {
    return null;
  }
}

function renderAvailabilityCalendar() {
  if (!availabilityCalendarGrid) return;
  const room = resRoomSelect.value;
  const guestCount = Number(resGuestsSelect.value);
  const year = availabilityCalendarDate.getFullYear();
  const month = availabilityCalendarDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekdayOffset = (monthStart.getDay() + 6) % 7;
  const selectedCheckin = resCheckin.value;
  const selectedCheckout = resCheckout.value;
  const capacity = ROOM_INVENTORY[room] || 0;
  const previousButton = document.getElementById("availabilityCalendarPrev");
  const nextButton = document.getElementById("availabilityCalendarNext");
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 12, 1);

  availabilityCalendarMonth.textContent = monthStart.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric"
  });
  availabilityCalendarRoom.textContent =
    `${room} · ${guestCount} ${guestCount === 1 ? "huésped" : "huéspedes"} · ${capacity} habitaciones en esta categoría`;
  previousButton.disabled = monthStart <= currentMonth;
  nextButton.disabled = monthStart >= lastMonth;
  availabilityCalendarGrid.replaceChildren();

  for (let blank = 0; blank < firstWeekdayOffset; blank++) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-day-spacer";
    spacer.setAttribute("aria-hidden", "true");
    availabilityCalendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateValue = toLocalDateInputValue(date);
    const nextDateValue = toLocalDateInputValue(new Date(year, month, day + 1));
    const roomCapacity = ROOM_CAPACITY[room];
    const guestCompatible = roomCapacity && guestCount >= roomCapacity.min && guestCount <= roomCapacity.max;
    const { available: nightlyAvailable } = getRoomAvailability(room, dateValue, nextDateValue);
    const available = guestCompatible ? nightlyAvailable : 0;
    const isPast = dateValue < localDate;
    const choosingCheckout = Boolean(selectedCheckin && !selectedCheckout && dateValue > selectedCheckin);
    const unavailableForStart = available === 0 && !choosingCheckout;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day ${available ? "available" : "unavailable"}`;
    if (dateValue === selectedCheckin) button.classList.add("selected-start");
    if (dateValue === selectedCheckout) button.classList.add("selected-end");
    if (selectedCheckin && selectedCheckout && dateValue > selectedCheckin && dateValue < selectedCheckout) {
      button.classList.add("selected-range");
    }
    button.disabled = isPast || unavailableForStart;
    button.setAttribute(
      "aria-label",
      `${date.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}: ` +
      `${available ? `${available} habitaciones disponibles` : "sin habitaciones disponibles"}`
    );
    button.title = button.getAttribute("aria-label");

    const dayNumber = document.createElement("span");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = String(day);
    const availability = document.createElement("span");
    availability.className = "calendar-day-count";
    availability.textContent = available ? `${available} disp.` : "Sin cupos";
    button.append(dayNumber, availability);
    button.addEventListener("click", () => selectAvailabilityDate(dateValue));
    availabilityCalendarGrid.appendChild(button);
  }

  if (selectedCheckin && selectedCheckout) {
    const available = getRoomAvailability(room, selectedCheckin, selectedCheckout).available;
    availabilityCalendarHint.textContent =
      `Estadía seleccionada: entrada ${selectedCheckin} y salida ${selectedCheckout}. ${available} habitación(es) disponibles.`;
  } else if (selectedCheckin) {
    availabilityCalendarHint.textContent = `Entrada seleccionada: ${selectedCheckin}. Elige una fecha posterior para la salida.`;
  } else {
    availabilityCalendarHint.textContent = "Elige una fecha disponible de entrada y luego una fecha de salida.";
  }
}

availabilityToggle.addEventListener("click", () => {
  const isExpanded = availabilityToggle.getAttribute("aria-expanded") === "true";
  availabilityToggle.setAttribute("aria-expanded", String(!isExpanded));
  availabilityCalendar.hidden = isExpanded;
  availabilityToggle.setAttribute(
    "aria-label",
    isExpanded ? "Mostrar calendario de disponibilidad" : "Ocultar calendario de disponibilidad"
  );
});

function selectAvailabilityDate(dateValue) {
  const capacity = ROOM_CAPACITY[resRoomSelect.value];
  const guests = Number(resGuestsSelect.value);
  if (!capacity || guests < capacity.min || guests > capacity.max) {
    availabilityCalendarHint.textContent =
      `${resRoomSelect.value} admite ${capacity.min}–${capacity.max} huéspedes. Ajusta la cantidad para elegir fechas.`;
    return;
  }

  if (!resCheckin.value || resCheckout.value || dateValue <= resCheckin.value) {
    resCheckin.value = dateValue;
    resCheckout.value = "";
    resCheckout.min = toLocalDateInputValue(new Date(
      Number(dateValue.slice(0, 4)),
      Number(dateValue.slice(5, 7)) - 1,
      Number(dateValue.slice(8, 10)) + 1
    ));
  } else {
    if (!checkAvailability(resRoomSelect.value, resCheckin.value, dateValue)) {
      availabilityCalendarHint.textContent =
        "No hay habitaciones disponibles durante toda esa estadía. Prueba otra salida o cambia de tipo de habitación.";
      return;
    }
    resCheckout.value = dateValue;
    resCheckout.min = resCheckin.value;
  }
  updateDirectPrice();
}

document.getElementById("availabilityCalendarPrev").addEventListener("click", () => {
  availabilityCalendarDate = new Date(
    availabilityCalendarDate.getFullYear(),
    availabilityCalendarDate.getMonth() - 1,
    1
  );
  renderAvailabilityCalendar();
});
document.getElementById("availabilityCalendarNext").addEventListener("click", () => {
  availabilityCalendarDate = new Date(
    availabilityCalendarDate.getFullYear(),
    availabilityCalendarDate.getMonth() + 1,
    1
  );
  renderAvailabilityCalendar();
});

function updateRoomOptionsForGuests() {
  if (!resRoomSelect || !resGuestsSelect) return;
  const guests = Number(resGuestsSelect.value);
  const checkin = resCheckin?.value || "";
  const checkout = resCheckout?.value || "";
  const hasValidDates = checkin && checkout && checkout > checkin;
  const options = [...resRoomSelect.options];
  options.forEach(option => {
    const capacity = ROOM_CAPACITY[option.value];
    const exceedsCapacity = Boolean(capacity && (guests < capacity.min || guests > capacity.max));
    const soldOut = hasValidDates && getRoomAvailability(option.value, checkin, checkout).available === 0;
    option.hidden = exceedsCapacity || soldOut;
    option.disabled = exceedsCapacity || soldOut;
  });
  if (resRoomSelect.selectedOptions[0]?.hidden) {
    const availableOption = options.find(option => !option.disabled);
    if (availableOption) resRoomSelect.value = availableOption.value;
  }
}

if (resCheckin && resCheckout) {
  refreshLocalDate();

  resCheckin.addEventListener("change", () => {
    resCheckout.min = resCheckin.value || localDate;
    if (resCheckout.value && resCheckout.value <= resCheckin.value) {
      resCheckout.value = "";
    }
    updateDirectPrice();
  });

  resCheckout.addEventListener("change", updateDirectPrice);
}

if (resRoomSelect) {
  resRoomSelect.addEventListener("change", () => {
    validateCapacity();
    updateDirectPrice();
  });
}

if (resGuestsSelect) {
  updateRoomOptionsForGuests();
  resGuestsSelect.addEventListener("change", () => {
    updateRoomOptionsForGuests();
    validateCapacity();
    updateDirectPrice();
  });
}

function validateCapacity() {
  if (!resRoomSelect || !resGuestsSelect) return true;

  const room = resRoomSelect.value;
  const cap = ROOM_CAPACITY[room] || { min: 1, max: 4 };
  const selected = parseInt(resGuestsSelect.value);

  if (selected > cap.max) {
    showToast(`⚠️ Límite excedido: ${room} permite un máximo de ${cap.max} personas.`);
    resGuestsSelect.value = cap.max;
    return false;
  } else if (selected < cap.min) {
    showToast(`⚠️ Mínimo requerido: ${room} requiere al menos ${cap.min} personas.`);
    resGuestsSelect.value = cap.min;
    return false;
  }
  return true;
}

function updateDirectPrice() {
  updateRoomOptionsForGuests();
  const ci = resCheckin.value;
  const co = resCheckout.value;
  const room = resRoomSelect.value;
  const guestCount = Number(resGuestsSelect.value);
  const capacity = ROOM_CAPACITY[room];
  const fitsGuests = capacity && guestCount >= capacity.min && guestCount <= capacity.max;

  if (fitsGuests && ci && co && new Date(co) > new Date(ci)) {
    const nights = calcNights(ci, co);
    const pricePerNight = ROOM_PRICES[room];
    const total = nights * pricePerNight;
    resTotalPrice.textContent = formatPEN(total);
    document.getElementById("resDeposit").textContent = formatPEN(total / 2);
    document.getElementById("resBalance").textContent = formatPEN(total / 2);
  } else {
    resTotalPrice.textContent = formatPEN(0);
    document.getElementById("resDeposit").textContent = formatPEN(0);
    document.getElementById("resBalance").textContent = formatPEN(0);
  }
  updateRoomAvailability(resRoomAvailability, room, ci, co);
  if (!fitsGuests) {
    availabilityFilterSummary.textContent =
      `${room} admite ${capacity.min}–${capacity.max} huéspedes. Ajusta la cantidad para consultar disponibilidad.`;
    resRoomAvailability.textContent = `Esta categoría admite de ${capacity.min} a ${capacity.max} huéspedes.`;
    resRoomAvailability.classList.remove("sold-out");
  } else if (ci && co && co > ci) {
    const result = getRoomAvailability(room, ci, co);
    availabilityFilterSummary.textContent = result.available
      ? `${room} · ${guestCount} ${guestCount === 1 ? "huésped" : "huéspedes"} · ${result.available} habitación(es) disponible(s)`
      : `${room} · ${guestCount} ${guestCount === 1 ? "huésped" : "huéspedes"} · Sin habitaciones disponibles para estas fechas`;
  } else {
    availabilityFilterSummary.textContent =
      `${room} · ${guestCount} ${guestCount === 1 ? "huésped" : "huéspedes"} · Selecciona entrada y salida para consultar cupos`;
  }
  renderAvailabilityCalendar();
}

function updateRoomAvailability(element, room, checkin, checkout) {
  if (!element) return;
  const { capacity, reserved, available } = getRoomAvailability(room, checkin, checkout);
  if (!checkin || !checkout || checkout <= checkin) {
    element.textContent = `Máximo ${capacity} habitaciones para esta categoría. Elige fechas para consultar cupos disponibles.`;
    element.classList.remove("sold-out");
    return;
  }

  element.textContent = available
    ? `Disponibles para estas fechas: ${available} de ${capacity} (máximo ocupado: ${reserved}).`
    : `Sin habitaciones disponibles para estas fechas (${reserved} de ${capacity} reservadas).`;
  element.classList.toggle("sold-out", available === 0);
}

function renderAmenities(roomName) {
  const container = document.getElementById("modalAmenities");
  if (!container) return;

  const amenities = ROOM_AMENITIES[roomName] || [];

  let html = `<span class="amenities-title">Comodidades incluidas</span>`;
  html += `<div class="amenities-grid">`;
  amenities.forEach(am => {
    const icon = AMENITY_ICONS[am] || "✓";
    html += `<div class="amenity-item"><span class="icon">${icon}</span> ${am}</div>`;
  });
  html += `</div>`;

  container.innerHTML = html;
}


// ============================================================
//  SISTEMA DE RESERVAS (CONECTADO A SPRING BOOT Y SUPABASE)
// ============================================================

let reservasGlobales = [];
let haSincronizado = false;

async function sincronizarReservasDesdeBackend() {
  try {
    const respuesta = await fetch("https://hotelsuiza.onrender.com/api/reservas");
    if (!respuesta.ok) throw new Error("Error al obtener reservas");
    
    const data = await respuesta.json();
    
    reservasGlobales = data.map(r => {
      let codeFinal = r.receiptCode || r.codigo || r.receipt_code;
      if (!codeFinal) {
        codeFinal = `SUI-${String(r.id).padStart(6, '0')}`;
      }

      return {
        ...r,
        databaseId: r.id, 
        id: r.codigo || String(r.id), 
        receiptCode: codeFinal, 
        createdAt: r.createdAt || new Date().toISOString()
      };
    });
    haSincronizado = true;
  } catch (error) {
    console.error("Error al sincronizar con la base de datos:", error);
  }
}

function formatPEN(amount) {
  return `S/ ${Number(amount).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getAmountPaid(reservation) {
  if (reservation.amountPaid !== undefined && Number.isFinite(Number(reservation.amountPaid))) {
    return Math.max(0, Number(reservation.amountPaid));
  }
  if (reservation.paymentStatus === "Pagado") return Number(reservation.total) || 0;
  if (reservation.paymentStatus === "Adelanto pagado") {
    return Number(reservation.depositAmount) || (Number(reservation.total) || 0) / 2;
  }
  return 0;
}

function loadReservations() {
  return reservasGlobales;
}

function calcNights(ci, co) {
  const a = new Date(ci + "T12:00:00");
  const b = new Date(co + "T12:00:00");
  return Math.max(1, Math.round((b - a) / 86400000));
}

function checkAvailability(roomName, checkinStr, checkoutStr) {
  return getRoomAvailability(roomName, checkinStr, checkoutStr).available > 0;
}

function getRoomAvailability(roomName, checkinStr, checkoutStr) {
  const capacity = ROOM_INVENTORY[roomName] || 0;
  if (!capacity || !checkinStr || !checkoutStr || checkoutStr <= checkinStr) {
    return { capacity, reserved: 0, available: capacity };
  }

  const reservations = loadReservations();
  const events = [];
  reservations.forEach(reservation => {
    if (reservation.room !== roomName || reservation.status === "Cancelada") return;
    if (!reservation.checkin || !reservation.checkout ||
        reservation.checkout <= checkinStr || reservation.checkin >= checkoutStr) return;

    events.push({
      date: reservation.checkin > checkinStr ? reservation.checkin : checkinStr,
      change: 1
    });
    events.push({
      date: reservation.checkout < checkoutStr ? reservation.checkout : checkoutStr,
      change: -1
    });
  });

  events.sort((a, b) => a.date.localeCompare(b.date) || a.change - b.change);
  let concurrent = 0;
  let reserved = 0;
  events.forEach(event => {
    concurrent += event.change;
    reserved = Math.max(reserved, concurrent);
  });

  return { capacity, reserved, available: Math.max(0, capacity - reserved) };
}

updateDirectPrice();


/* ============================================================
   Helpers de asignación de habitación física
   ============================================================ */
function getOccupiedRoomNumbers(category, checkin, checkout) {
  const occupied = new Map();
  loadReservations().forEach(r => {
    if (r.room !== category || !r.assignedRoomNumber) return;
    if (r.status === "Cancelada" || r.status === "Completada") return;
    if (!r.checkin || !r.checkout) return;
    if (r.checkout <= checkin || r.checkin >= checkout) return;
    occupied.set(r.assignedRoomNumber, r);
  });
  return occupied;
}

function getAvailableRoomNumbers(reservation) {
  const all = ROOM_NUMBERING[reservation.room] || [];
  const occupied = getOccupiedRoomNumbers(reservation.room, reservation.checkin, reservation.checkout);
  return all.filter(n => !occupied.has(n) && n !== reservation.assignedRoomNumber);
}


// ============================================================
//  MODAL DE RESERVA (sitio público)
// ============================================================

const reserveModal   = document.getElementById("reserveModal");
const reserveSummary = document.getElementById("reserveSummary");
const rRoom   = document.getElementById("rRoom");
const rTotal  = document.getElementById("rTotal");

let reserveContext = { checkin: "", checkout: "", guests: "", guestCount: 2 };

function openReserveModal(presetRoom) {
  refreshLocalDate();

  let ciVal = resCheckin ? resCheckin.value : "";
  let coVal = resCheckout ? resCheckout.value : "";
  let gVal = document.getElementById("resGuests") ? document.getElementById("resGuests").value : "2";

  if (!ciVal) ciVal = localDate;
  if (!coVal) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    coVal = tomorrow.toISOString().split("T")[0];
  }

  reserveContext.checkin  = ciVal;
  reserveContext.checkout = coVal;
  reserveContext.guests   = gVal + " huésped" + (gVal === "1" ? "" : "es");
  reserveContext.guestCount = Number(gVal);

  const fmt = d => new Date(d + "T12:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric"
  });

  const nights = calcNights(reserveContext.checkin, reserveContext.checkout);

  reserveSummary.innerHTML =
    `<b>${fmt(reserveContext.checkin)}</b> → <b>${fmt(reserveContext.checkout)}</b>` +
    ` · ${nights} noche${nights > 1 ? "s" : ""} · ${reserveContext.guests}`;

  if (presetRoom && ROOM_PRICES[presetRoom]) {
    rRoom.value = presetRoom;
  }

  updateReserveTotal();

  reserveModal.classList.add("open");
  reserveModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function updateReserveTotal() {
  updateReserveRoomOptions();
  const nights = calcNights(reserveContext.checkin, reserveContext.checkout);
  const price  = ROOM_PRICES[rRoom.value] || 0;
  const total = nights * price;
  rTotal.textContent = formatPEN(total);
  document.getElementById("rDeposit").textContent = formatPEN(total / 2);
  document.getElementById("rBalance").textContent = formatPEN(total / 2);
  updateRoomAvailability(
    document.getElementById("rRoomAvailability"),
    rRoom.value,
    reserveContext.checkin,
    reserveContext.checkout
  );
}

function updateReserveRoomOptions() {
  const guests = Number(reserveContext.guestCount) || 1;
  const hasValidDates = reserveContext.checkin && reserveContext.checkout &&
    reserveContext.checkout > reserveContext.checkin;
  const options = [...rRoom.options];
  options.forEach(option => {
    const capacity = ROOM_CAPACITY[option.value];
    const exceedsCapacity = Boolean(capacity && (guests < capacity.min || guests > capacity.max));
    const soldOut = hasValidDates &&
      getRoomAvailability(option.value, reserveContext.checkin, reserveContext.checkout).available === 0;
    option.hidden = exceedsCapacity || soldOut;
    option.disabled = exceedsCapacity || soldOut;
  });
  if (rRoom.selectedOptions[0]?.disabled) {
    const availableOption = options.find(option => !option.disabled);
    if (availableOption) rRoom.value = availableOption.value;
  }
}

rRoom.addEventListener("change", updateReserveTotal);

function closeReserveModal() {
  reserveModal.classList.remove("open");
  reserveModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-rclose]").forEach(el => {
  el.addEventListener("click", closeReserveModal);
});

const RESERVATION_LOOKUP_EMAIL = "suiza_reservation_lookup_email";
const reservationReceiptModal = document.getElementById("reservationReceiptModal");
const myReservationsModal = document.getElementById("myReservationsModal");

function openReservationReceipt(reservation, syncMessage) {
  sessionStorage.setItem(RESERVATION_LOOKUP_EMAIL, reservation.email.toLowerCase());
  document.getElementById("receiptReservationId").textContent = reservation.id;
  document.getElementById("receiptGuest").textContent = reservation.name;
  document.getElementById("receiptRoom").textContent = reservation.assignedRoomNumber
    ? `${reservation.room} · Hab. ${reservation.assignedRoomNumber}`
    : reservation.room;
  document.getElementById("receiptDates").textContent = `${reservation.checkin} al ${reservation.checkout}`;
  document.getElementById("receiptGuests").textContent = reservation.guests;
  document.getElementById("receiptNights").textContent = String(reservation.nights);
  document.getElementById("receiptTotal").textContent = formatPEN(reservation.total);
  document.getElementById("receiptCode").textContent = reservation.receiptCode || reservation.codigo || `SUI-${String(reservation.databaseId || reservation.id).padStart(6, '0')}`;
  document.getElementById("receiptBalance").textContent =
    `${formatPEN(reservation.depositAmount || 0)} de adelanto · ${formatPEN(reservation.balanceDue ?? reservation.total)} de saldo`;
  document.getElementById("receiptStatus").textContent = reservation.status;
  document.getElementById("receiptPayment").textContent = `${reservation.paymentMethod} · ${reservation.paymentStatus}`;
  document.getElementById("receiptSyncMessage").textContent = syncMessage;
  updateMyReservationsButton();
  reservationReceiptModal.classList.add("open");
  reservationReceiptModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeReservationReceipt() {
  reservationReceiptModal.classList.remove("open");
  reservationReceiptModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function openMyReservations(email = "") {
  const account = getCurrentUser();
  const lookupEmail = (email || (account ? account.email : sessionStorage.getItem(RESERVATION_LOOKUP_EMAIL)) || "")
    .trim().toLowerCase();
  const list = document.getElementById("myReservationsList");
  list.replaceChildren();

  const reservations = lookupEmail
    ? loadReservations().filter(reservation => (reservation.email || "").trim().toLowerCase() === lookupEmail)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : [];

  if (!reservations.length) {
    const empty = document.createElement("p");
    empty.className = "my-reservations-empty";
    empty.textContent = lookupEmail
      ? "No encontramos reservas asociadas a este correo en este dispositivo."
      : "Inicia sesión con tu cuenta o realiza una reserva para consultar tus estadías.";
    list.appendChild(empty);
  } else {
    reservations.forEach(reservation => {
      const card = document.createElement("article");
      card.className = "my-reservation-card";
      const heading = document.createElement("div");
      heading.className = "my-reservation-heading";
      const id = document.createElement("strong");
      id.textContent = reservation.id;
      const status = document.createElement("span");
      status.className = `badge ${(reservation.status || "").toLowerCase()}`;
      status.textContent = reservation.status;
      heading.append(id, status);
      const room = document.createElement("h3");
      room.textContent = reservation.room;
      const dates = document.createElement("p");
      dates.textContent = `${reservation.checkin} al ${reservation.checkout} · ${reservation.nights} noche(s)`;
      const guests = document.createElement("p");
      guests.textContent = `Huéspedes: ${reservation.guests}`;
      const total = document.createElement("p");
      total.className = "my-reservation-total";
      total.textContent = `Total: S/ ${Number(reservation.total).toLocaleString("es-PE")}`;
      const payment = document.createElement("p");
      payment.className = "my-reservation-payment";
      payment.textContent = `Pago: ${reservation.paymentMethod || "Pago en el hotel"} · ${reservation.paymentStatus || "Pendiente"}. Saldo: ${formatPEN(reservation.balanceDue ?? reservation.total)}`;
      const receiptCode = document.createElement("p");
      receiptCode.className = "my-reservation-payment";
      receiptCode.textContent = `Código para presentar en recepción: ${reservation.receiptCode || reservation.codigo || `SUI-${String(reservation.databaseId || reservation.id).padStart(6, '0')}`}`;
      card.append(heading, room, dates, guests, total, payment, receiptCode);

      if (reservation.assignedRoomNumber) {
        const hab = document.createElement("p");
        hab.className = "my-reservation-payment";
        hab.textContent = `Número de habitación asignado: ${reservation.assignedRoomNumber}`;
        card.appendChild(hab);
      }

      list.appendChild(card);
    });
  }

  myReservationsModal.classList.add("open");
  myReservationsModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeMyReservations() {
  myReservationsModal.classList.remove("open");
  myReservationsModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-receipt-close]").forEach(button =>
  button.addEventListener("click", closeReservationReceipt)
);
document.querySelectorAll("[data-my-reservations-close]").forEach(button =>
  button.addEventListener("click", closeMyReservations)
);
document.getElementById("receiptViewReservations").addEventListener("click", () => {
  const reservationEmail = sessionStorage.getItem(RESERVATION_LOOKUP_EMAIL) || "";
  closeReservationReceipt();
  openMyReservations(reservationEmail);
});
document.getElementById("navMyReservations").addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.textContent = "☰";
  openMyReservations();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeReserveModal();
    closeReservationReceipt();
    closeMyReservations();
  }
});


// ---------- "Consultar esta habitación" desde el modal ----------
document.getElementById("modalBook").addEventListener("click", event => {
  event.preventDefault();
  closeModal();

  if (resRoomSelect && currentRoom) {
    resRoomSelect.value = currentRoom;
    validateCapacity();
    updateDirectPrice();
  }

  document.getElementById("reservar").scrollIntoView({ behavior: "smooth" });
});


// ---------- CONFIRMAR RESERVA (Modal Tradicional) ----------
document.getElementById("reserveForm").addEventListener("submit", async event => {
  event.preventDefault();

  const capacity = ROOM_CAPACITY[rRoom.value];
  if (!capacity || reserveContext.guestCount < capacity.min || reserveContext.guestCount > capacity.max) {
    showToast("El tipo de habitación seleccionado no admite esa cantidad de huéspedes.");
    return;
  }

  const nights = calcNights(reserveContext.checkin, reserveContext.checkout);
  const price  = ROOM_PRICES[rRoom.value] || 0;
  const total = nights * price;
  const paymentReference = document.getElementById("rPaymentReference").value.trim();

  if (!document.getElementById("rPolicyAccepted").checked || !paymentReference) {
    showToast("Acepta las políticas e ingresa el número de operación de Yape.");
    return;
  }

  if (!checkAvailability(rRoom.value, reserveContext.checkin, reserveContext.checkout)) {
    showToast("Lo sentimos, no quedan habitaciones de este tipo disponibles en esas fechas.");
    return;
  }

  const nuevaReserva = {
    name: document.getElementById("rName").value.trim(),
    email: document.getElementById("rEmail").value.trim(),
    phone: document.getElementById("rPhone").value.trim(),
    room: rRoom.value,
    checkin: reserveContext.checkin,
    checkout: reserveContext.checkout,
    guests: reserveContext.guests,
    nights: nights,
    price: price,
    total: total,
    depositAmount: total / 2,
    balanceDue: total / 2,
    paymentReference: paymentReference,
    paymentMethod: "Yape",
    paymentStatus: "Adelanto por verificar",
    status: "Pendiente",
    createdAt: new Date().toISOString()
  };

  try {
    const respuesta = await fetch("https://hotelsuiza.onrender.com/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaReserva)
    });
    
    if (respuesta.ok) {
      const guardada = await respuesta.json();
      
      closeReserveModal();
      event.target.reset();
      updateReserveTotal();
      
      await sincronizarReservasDesdeBackend();
      const reservaFinal = loadReservations().find(r => String(r.databaseId) === String(guardada.id)) || guardada;
      
      openReservationReceipt(reservaFinal, "Solicitud enviada al servidor. El hotel debe verificar el adelanto.");
    } else {
      const errorText = await respuesta.text();
      console.error("Error del servidor Spring Boot:", respuesta.status, errorText);
      throw new Error(`Error ${respuesta.status}: ${errorText}`);
    }
  } catch (error) {
    console.error("Fallo al conectar:", error);
    showToast(`❌ ${error.message || "Error al conectar con el servidor."}`);
  }
});


// ============================================================
//  ACCESO ADMIN
// ============================================================

const adminAccess = document.getElementById("adminAccess");
const adminLogin  = document.getElementById("adminLogin");
const adminPanel  = document.getElementById("adminPanel");

const ADMIN_FLAG = "suiza_admin_session_v2";
const ADMIN_ACTIVITY_KEY = "suiza_admin_activity_v1";
const ADMIN_USER_KEY = "suiza_admin_username";

function loadAdminActivity() {
  try {
    const activity = JSON.parse(localStorage.getItem(ADMIN_ACTIVITY_KEY)) || [];
    return Array.isArray(activity) ? activity : [];
  } catch (error) {
    console.error("No se pudo leer el historial de actividad:", error);
    return [];
  }
}

function recordAdminEvent(username, action) {
  const activity = loadAdminActivity();
  activity.unshift({
    timestamp: new Date().toISOString(),
    username,
    action
  });

  try {
    localStorage.setItem(ADMIN_ACTIVITY_KEY, JSON.stringify(activity.slice(0, 500)));
  } catch (error) {
    console.error("No se pudo guardar el acceso de administración:", error);
    showToast("No se pudo guardar el registro de actividad.");
  }
}

function recordAdminLogin(username) {
  recordAdminEvent(username, "Inició sesión en la administración");
}

function openLogin() {
  if (sessionStorage.getItem(ADMIN_FLAG) === "1") {
    openAdminPanel();
    return;
  }
  adminLogin.classList.add("open");
  adminLogin.setAttribute("aria-hidden", "false");
  document.getElementById("loginError").textContent = "";
  document.body.style.overflow = "hidden";
}

function closeLogin() {
  adminLogin.classList.remove("open");
  adminLogin.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

adminAccess.addEventListener("click", openLogin);

document.querySelectorAll("[data-lclose]").forEach(el => {
  el.addEventListener("click", closeLogin);
});

// 🔥 LOGIN CONECTADO A SPRING BOOT Y SUPABASE
document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  const err  = document.getElementById("loginError");
  
  err.textContent = ""; 
  const btnSubmit = event.target.querySelector('button[type="submit"]');
  const originalText = btnSubmit.textContent;
  btnSubmit.textContent = "Verificando...";
  btnSubmit.disabled = true;

  try {
    const respuesta = await fetch("https://hotelsuiza.onrender.com/api/empleados/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    if (respuesta.ok) {
      const empleado = await respuesta.json();
      
      sessionStorage.setItem(ADMIN_USER_KEY, empleado.username);
      sessionStorage.setItem(ADMIN_FLAG, "1");
      
      recordAdminLogin(empleado.username);

      closeLogin();
      event.target.reset();
      openAdminPanel();
      showToast("Bienvenido al panel de administración.");
    } else {
      const errorText = await respuesta.text();
      err.textContent = errorText || "Credenciales incorrectas o usuario inactivo.";
    }
  } catch (error) {
    console.error("Error de conexión con el servidor:", error);
    err.textContent = "No se pudo conectar con el servidor. Intenta más tarde.";
  } finally {
    btnSubmit.textContent = originalText;
    btnSubmit.disabled = false;
  }
});


// ============================================================
//  PANEL ADMIN
// ============================================================

async function openAdminPanel() {
  adminPanel.classList.add("open");
  adminPanel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const currentUsername = sessionStorage.getItem(ADMIN_USER_KEY);
  let role = "recepcion"; 

  await sincronizarEmpleadosDesdeBackend();
  const emp = getEmployees().find(e => e.username === currentUsername);
  
  if (currentUsername === "recepcion.manana" || currentUsername === "recepcion.tarde" || currentUsername === "recepcion.noche") {
    role = "admin";
  } else if (emp) {
    role = emp.role;
  }

  const isAdmin = role === "admin";
  
  document.querySelector('[data-admin-tab="reportes"]').style.display = isAdmin ? "" : "none";
  document.querySelector('[data-admin-tab="empleados"]').style.display = isAdmin ? "" : "none";
  document.querySelector('[data-admin-tab="actividad"]').style.display = isAdmin ? "" : "none";

  if (!isAdmin) {
    switchAdminTab("dashboard");
  }

  await sincronizarReservasDesdeBackend();
  
  renderAdmin();
}

function closeAdminPanel() {
  adminPanel.classList.remove("open");
  adminPanel.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.getElementById("adminExitSite").addEventListener("click", closeAdminPanel);

document.getElementById("adminLogout").addEventListener("click", () => {
  sessionStorage.removeItem(ADMIN_FLAG);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  closeAdminPanel();
  showToast("Sesión cerrada.");
});


// ---------- PESTAÑAS DEL ADMIN ----------
const adminTabs = document.querySelectorAll(".admin-tab");
const adminViews = document.querySelectorAll(".admin-view");
const adminTitle = document.getElementById("adminTitle");
const adminSubtitle = document.getElementById("adminSubtitle");

const VIEW_TITLES = {
  dashboard:    ["Dashboard", "Resumen general de operaciones"],
  reservas:     ["Reservas", "Gestiona todas las reservas del hotel"],
  reportes:     ["Reportes", "Análisis de ingresos y comportamiento"],
  huespedes:    ["Huéspedes", "Consulta las reservas y el gasto de cada huésped"],
  habitaciones: ["Habitaciones", "Estado de ocupación por número de cuarto"],
  empleados:    ["Empleados", "Crea, edita y desactiva usuarios del sistema"],
  actividad:    ["Actividad del Sistema", "Historial de accesos a la administración"]
};

function switchAdminTab(name) {
  adminTabs.forEach(t => t.classList.toggle("active", t.dataset.adminTab === name));
  adminViews.forEach(v => v.classList.toggle("active", v.dataset.view === name));
  adminTitle.textContent = VIEW_TITLES[name][0];
  adminSubtitle.textContent = VIEW_TITLES[name][1];
}

adminTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    switchAdminTab(tab.dataset.adminTab);
    renderAdmin();
  });
});

document.getElementById("viewAllReservations").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "all";
  switchAdminTab("reservas");
  renderAdmin();
});


// ---------- FILTROS DE LA TABLA ----------
const searchInput  = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const filterDateStart = document.getElementById("filterDateStart");
const filterDateEnd = document.getElementById("filterDateEnd");

searchInput.addEventListener("input", renderReservationsTable);
statusFilter.addEventListener("change", renderReservationsTable);
if (filterDateStart) filterDateStart.addEventListener("change", renderReservationsTable);
if (filterDateEnd) filterDateEnd.addEventListener("change", renderReservationsTable);


// ---------- RENDER PRINCIPAL ----------
function renderAdmin() {
  renderKPIs();
  renderRoomsChart();
  renderLatestReservations();
  renderReservationsTable();
  renderReports();
  initReportFilters();
  renderReportsExtended();
  renderGuests();
  renderRegisteredAccounts();
  renderAdminActivity();
  renderEmployees();
  renderRoomsBoard();
}

function renderRegisteredAccounts() {
  const tbody = document.getElementById("registeredAccountsTable");
  if (!tbody) return;
  const users = getUsers().slice().sort((a, b) =>
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  tbody.replaceChildren();

  if (!users.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = "Todavía no hay cuentas creadas en este navegador.";
    return;
  }

  users.forEach(user => {
    const row = tbody.insertRow();
    row.insertCell().textContent = user.name || "Sin nombre";
    row.insertCell().textContent = user.email || "Sin correo";
    row.insertCell().textContent = user.verified ? "Verificada" : "Pendiente";
    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    row.insertCell().textContent = createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleString("es-PE")
      : "No disponible";
  });
}

function renderGuests() {
  const tbody = document.getElementById("guestTable");
  if (!tbody) return;
  const guests = new Map();
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  loadReservations().forEach(reservation => {
    const email = (reservation.email || "").trim();
    const key = email.toLowerCase() || reservation.name;
    if (!guests.has(key)) {
      guests.set(key, {
        name: reservation.name || "Sin nombre",
        email: email || "Sin email",
        count: 0,
        spent: 0,
        currentRoom: null,
        hasUpcoming: false
      });
    }

    const guest = guests.get(key);
    guest.count++;
    if (reservation.status !== "Cancelada") {
      guest.spent += getAmountPaid(reservation);
      if ((reservation.checkedInAt && !reservation.checkedOutAt) ||
          (reservation.status === "Confirmada" && reservation.checkin <= todayISO && reservation.checkout >= todayISO)) {
        guest.currentRoom = reservation.room;
      } else if (reservation.checkin > todayISO) {
        guest.hasUpcoming = true;
      }
    }
  });

  tbody.replaceChildren();
  const sortedGuests = [...guests.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (!sortedGuests.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = "Todavía no hay huéspedes registrados.";
    return;
  }

  sortedGuests.forEach(guest => {
    const row = tbody.insertRow();
    [guest.name, guest.email, `${guest.count} reserva${guest.count === 1 ? "" : "s"}`,
      `S/ ${guest.spent.toLocaleString("es-PE")}`].forEach(value => {
      row.insertCell().textContent = value;
    });

    const statusCell = row.insertCell();
    const badge = document.createElement("span");
    badge.className = `badge ${guest.currentRoom ? "confirmada" : guest.hasUpcoming ? "pendiente" : "completada"}`;
    badge.textContent = guest.currentRoom
      ? `En hotel (${guest.currentRoom})`
      : guest.hasUpcoming ? "Próxima reserva" : "Inactivo";
    statusCell.appendChild(badge);
  });
}

function renderAdminActivity() {
  const tbody = document.getElementById("logsTable");
  if (!tbody) return;
  const activity = loadAdminActivity();
  tbody.replaceChildren();

  if (!activity.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.textContent = "Todavía no hay accesos registrados.";
    return;
  }

  activity.forEach(entry => {
    const row = tbody.insertRow();
    const timestamp = new Date(entry.timestamp);
    row.insertCell().textContent = Number.isNaN(timestamp.getTime())
      ? "Fecha no disponible"
      : timestamp.toLocaleString("es-PE", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      });
    row.insertCell().textContent = entry.username || "Administrador";
    row.insertCell().textContent = entry.action || "Inició sesión en la administración";
  });
}


// ---------- KPIs ----------
function renderKPIs() {
  const list = loadReservations();
  const activas = list.filter(r => r.status !== "Cancelada");

  const total     = list.length;
  const revenue   = activas.reduce((s, r) => s + getAmountPaid(r), 0);
  const nights    = activas.reduce((s, r) => s + r.nights, 0);
  const avg       = activas.length ? revenue / activas.length : 0;

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiRevenue").textContent = "S/ " + revenue.toLocaleString("es-PE");
  document.getElementById("kpiNights").textContent = nights;
  document.getElementById("kpiAvg").textContent = "S/ " + Math.round(avg).toLocaleString("es-PE");
}


// ---------- CHART: reservas por habitación ----------
function renderRoomsChart() {
  const list = loadReservations();
  const counts = {};
  Object.keys(ROOM_PRICES).forEach(r => counts[r] = 0);
  list.forEach(r => { counts[r.room] = (counts[r.room] || 0) + 1; });

  const max = Math.max(1, ...Object.values(counts));
  const container = document.getElementById("chartRooms");
  if (!container) return;
  container.innerHTML = "";

  Object.entries(counts).forEach(([room, count]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${room}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <strong>${count}</strong>
    `;
    container.appendChild(row);
  });
}


// ---------- ÚLTIMAS RESERVAS ----------
function renderLatestReservations() {
  const list = loadReservations()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const container = document.getElementById("latestReservations");
  const viewAllButton = document.getElementById("viewAllReservations");
  if (!container) return;
  container.innerHTML = "";
  if (viewAllButton) viewAllButton.hidden = loadReservations().length <= list.length;

  if (!list.length) {
    container.innerHTML = `<div class="mini-item"><span class="mi-sub">Sin reservas registradas.</span></div>`;
    return;
  }

  list.forEach(r => {
    const div = document.createElement("div");
    div.className = "mini-item";
    div.innerHTML = `
      <div>
        <span class="mi-name">${r.name}</span>
        <span class="mi-sub">${r.room} · ${r.checkin}${r.assignedRoomNumber ? " · Hab. " + r.assignedRoomNumber : ""}</span>
      </div>
      <span class="mi-total">S/ ${r.total.toLocaleString("es-PE")}</span>
    `;
    container.appendChild(div);
  });
}


// ---------- TABLA DE RESERVAS ----------
function renderReservationsTable() {
  const list = loadReservations().slice().reverse();

  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const dateStart = filterDateStart ? filterDateStart.value : "";
  const dateEnd = filterDateEnd ? filterDateEnd.value : "";

  const filtered = list.filter(r => {
    const okStatus = status === "all" || r.status === status;
    const okSearch =
      !search ||
      r.name.toLowerCase().includes(search) ||
      r.id.toLowerCase().includes(search) ||
      (r.receiptCode || "").toLowerCase().includes(search) ||
      r.room.toLowerCase().includes(search) ||
      (r.assignedRoomNumber || "").toLowerCase().includes(search);
      
    let okDate = true;
    if (dateStart && r.checkin < dateStart) okDate = false;
    if (dateEnd && r.checkin > dateEnd) okDate = false;

    return okStatus && okSearch && okDate;
  });

  document.getElementById("tableCount").textContent =
    `${filtered.length} reserva${filtered.length === 1 ? "" : "s"}`;

  const tbody = document.getElementById("reservationTable");
  tbody.innerHTML = "";

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="13">No se encontraron reservas con esos criterios.</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement("tr");

    const badgeClass = r.status.toLowerCase();
    const statusOptions = ["Pendiente", "Confirmada", "Hospedado", "Completada", "Cancelada"]
      .map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`)
      .join("");
    const currentPaymentStatus = r.paymentStatus || "Pendiente";
    const paymentOptions = ["Pendiente", "Adelanto por verificar", "Adelanto pagado", "Pagado"]
    .map(s => `<option ${s === currentPaymentStatus ? "selected" : ""}>${s}</option>`)
    .join("");

    const finalCode = r.receiptCode || r.codigo || `SUI-${String(r.databaseId || r.id).padStart(6, '0')}`;

    tr.innerHTML = `
      <td><b>${r.id}</b></td>
      <td>
        <span class="cell-name">${r.name}</span>
        <span class="cell-sub">${r.email}</span>
      </td>
      <td>${r.room}</td>
      <td>
        <b>${r.assignedRoomNumber || "—"}</b>
        ${(!r.assignedRoomNumber && (r.status === "Confirmada" || r.status === "Pendiente"))
          ? `<button class="row-edit" data-room-assign="${r.id}" title="Asignar habitación" style="width:26px;height:26px;margin-left:4px;">+</button>`
          : ""}
      </td>
      <td>${r.checkin}</td>
      <td>${r.checkout}</td>
      <td>${r.nights}</td>
      <td><b>S/ ${r.total.toLocaleString("es-PE")}</b></td>
      <td><b>${finalCode}</b></td>
      <td></td>
      <td><span class="badge ${badgeClass}">${r.status}</span></td>
      <td class="stay-record">
        <small>Entrada: ${formatStayTimestamp(r.checkedInAt)}</small>
        <small>Salida: ${formatStayTimestamp(r.checkedOutAt)}</small>
        ${r.status === "Confirmada" && !r.checkedInAt
          ? `<button class="btn-stay-action" data-stay-action="checkin" data-id="${r.id}">Registrar entrada</button>`
          : ""}
        ${r.checkedInAt && !r.checkedOutAt
          ? `<button class="btn-stay-action" data-stay-action="checkout" data-id="${r.id}">Registrar salida</button>`
          : ""}
      </td>
      <td style="display:flex;gap:8px;align-items:center;">
        <select class="row-status" data-id="${r.id}">${statusOptions}</select>
        <button class="row-delete" data-id="${r.id}" title="Eliminar">✕</button>
      </td>
    `;

    const paymentCell = tr.children[9];
    const paymentSelect = document.createElement("select");
    paymentSelect.className = "row-payment-status";
    paymentSelect.dataset.id = r.id;
    paymentSelect.setAttribute("aria-label", `Estado de pago para ${r.id}`);
    paymentSelect.innerHTML = paymentOptions;
    const paymentDetails = document.createElement("small");
    paymentDetails.textContent =
      `Operación: ${r.paymentReference || "—"} · Adelanto: ${formatPEN(r.depositAmount ?? (r.total / 2))}`;
    paymentCell.append(paymentSelect, paymentDetails);

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-room-assign]").forEach(btn => {
    btn.addEventListener("click", () => {
      const list = loadReservations();
      const res = list.find(r => r.id === btn.dataset.roomAssign);
      if (res) openRoomAssignModal(res);
    });
  });

  // ACTUALIZAR PAGO
  tbody.querySelectorAll(".row-payment-status").forEach(sel => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      const item = loadReservations().find(r => r.id === id);
      if (!item) return;

      let amountPaid = 0;
      if (sel.value === "Pagado") amountPaid = Number(item.total) || 0;
      else if (sel.value === "Adelanto pagado") amountPaid = Number(item.depositAmount) || (Number(item.total) || 0) / 2;
      
      const nuevaData = {
        status: item.status,
        paymentStatus: sel.value,
        amountPaid: amountPaid,
        balanceDue: Math.max(0, (Number(item.total) || 0) - amountPaid),
        assignedRoomNumber: item.assignedRoomNumber,
        checkedInAt: formatearFechaJava(item.checkedInAt),
        checkedOutAt: formatearFechaJava(item.checkedOutAt)
      };

      const targetId = item.databaseId || item.id;

      try {
        const respuesta = await fetch(`https://hotelsuiza.onrender.com/api/reservas/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevaData)
        });
        
        if (!respuesta.ok) throw new Error("Error en servidor");
        
        showToast(`Pago actualizado a ${sel.value}.`);
        
        // Bloqueo seguro para errores visuales
        try {
          await sincronizarReservasDesdeBackend();
          renderAdmin();
        } catch (uiError) { console.error("Error visual al actualizar pago:", uiError); }
        
      } catch (error) {
        console.error("Error al actualizar el pago:", error);
        showToast("Error al actualizar el pago.");
      }
    });
  });

  // ACTUALIZAR ESTADO
  tbody.querySelectorAll(".row-status").forEach(sel => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      const item = loadReservations().find(r => r.id === id);
      if (!item) return;

      if (sel.value === "Hospedado" && !item.checkedInAt || sel.value === "Completada" && !item.checkedOutAt) {
        renderReservationsTable();
        showToast("Usa los botones de entrada y salida.");
        return;
      }

      const nuevaData = {
        status: sel.value,
        paymentStatus: item.paymentStatus,
        amountPaid: item.amountPaid,
        balanceDue: item.balanceDue,
        assignedRoomNumber: item.assignedRoomNumber,
        checkedInAt: formatearFechaJava(item.checkedInAt),
        checkedOutAt: formatearFechaJava(item.checkedOutAt)
      };

      const targetId = item.databaseId || item.id;

      try {
        const respuesta = await fetch(`https://hotelsuiza.onrender.com/api/reservas/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevaData)
        });
        
        if (!respuesta.ok) throw new Error("Error en servidor");

        showToast(`Estado actualizado a ${sel.value}.`);

        try {
          await sincronizarReservasDesdeBackend();
          renderAdmin();
        } catch (uiError) { console.error("Error visual al actualizar estado:", uiError); }

      } catch (error) {
        console.error("Error al actualizar el estado:", error);
        showToast("Error al actualizar el estado.");
      }
    });
  });

  // ELIMINAR RESERVA
  tbody.querySelectorAll(".row-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const confirmed = await showAppDialog({
        title: "Eliminar reserva",
        message: "¿Deseas eliminar esta reserva definitivamente?",
        confirmText: "Eliminar",
        cancelText: "Conservar reserva",
        danger: true
      });
      if (!confirmed) return;

      const item = loadReservations().find(r => r.id === btn.dataset.id);
      if (!item) return;

      const targetId = item.databaseId || item.id;

      try {
        const respuesta = await fetch(`https://hotelsuiza.onrender.com/api/reservas/${targetId}`, {
          method: "DELETE"
        });
        
        if (!respuesta.ok) throw new Error("Error en servidor");

        await sincronizarReservasDesdeBackend();
        renderAdmin();
        showToast("Reserva eliminada de la nube.");
      } catch (error) {
        console.error("Error al eliminar la reserva:", error);
        showToast("Error al eliminar la reserva.");
      }
    });
  });

  // BOTONES DE ENTRADA / SALIDA
  tbody.querySelectorAll("[data-stay-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.stayAction === "checkin") registerGuestCheckIn(button.dataset.id);
      else registerGuestCheckOut(button.dataset.id);
    });
  });
}

function formatStayTimestamp(timestamp) {
  if (!timestamp) return "Pendiente";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Registro inválido"
    : date.toLocaleString("es-PE", { timeZone: "America/Lima" });
}

async function registerGuestCheckIn(id) {
  const reservation = loadReservations().find(item => item.id === id);
  if (!reservation || reservation.status !== "Confirmada") {
    showToast("Solo se puede registrar entrada de reservas confirmadas.");
    return;
  }
  if (!reservation.assignedRoomNumber) {
    openRoomAssignModal(reservation);
    showToast("Asigna primero un número de habitación.");
    return;
  }

  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

  const nuevaData = { 
    status: "Hospedado",
    paymentStatus: reservation.paymentStatus,
    amountPaid: reservation.amountPaid,
    balanceDue: reservation.balanceDue,
    assignedRoomNumber: reservation.assignedRoomNumber,
    checkedInAt: localDateTime,
    checkedOutAt: formatearFechaJava(reservation.checkedOutAt)
  };

  const targetId = reservation.databaseId || reservation.id;

  try {
    const respuesta = await fetch(`https://hotelsuiza.onrender.com/api/reservas/${targetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaData)
    });
    if (!respuesta.ok) throw new Error();
    
    showToast(`Entrada registrada con éxito.`);
    
    try {
      await sincronizarReservasDesdeBackend();
      renderAdmin();
    } catch (visualError) { console.error("Fallo visual:", visualError); }

  } catch (error) {
    console.error("Error al registrar entrada:", error);
    showToast("Error de red al registrar entrada.");
  }
}

async function registerGuestCheckOut(id) {
  const reservation = loadReservations().find(item => item.id === id);
  if (!reservation || !reservation.checkedInAt) return;

  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

  const nuevaData = { 
    status: "Completada",
    paymentStatus: reservation.paymentStatus,
    amountPaid: reservation.amountPaid,
    balanceDue: reservation.balanceDue,
    assignedRoomNumber: reservation.assignedRoomNumber,
    checkedInAt: formatearFechaJava(reservation.checkedInAt),
    checkedOutAt: localDateTime
  };

  const targetId = reservation.databaseId || reservation.id;

  try {
    const respuesta = await fetch(`https://hotelsuiza.onrender.com/api/reservas/${targetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaData)
    });
    if (!respuesta.ok) throw new Error();

    showToast(`Salida registrada con éxito.`);

    try {
      await sincronizarReservasDesdeBackend();
      renderAdmin();
    } catch (visualError) { console.error("Fallo visual:", visualError); }

  } catch (error) {
    console.error("Error al registrar salida:", error);
    showToast("Error de red al registrar salida.");
  }
}


// ---------- REPORTES ----------
function renderReports() {
  const list = loadReservations();

  const revenue = {};
  Object.keys(ROOM_PRICES).forEach(r => revenue[r] = 0);
  list.filter(r => r.status !== "Cancelada").forEach(r => {
    revenue[r.room] = (revenue[r.room] || 0) + r.total;
  });

  const maxRev = Math.max(1, ...Object.values(revenue));
  const revContainer = document.getElementById("reportRevenue");
  if (revContainer) {
    revContainer.innerHTML = "";
    Object.entries(revenue).forEach(([room, amount]) => {
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <span>${room}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(amount / maxRev) * 100}%"></div></div>
        <strong>S/ ${amount.toLocaleString("es-PE")}</strong>
      `;
      revContainer.appendChild(row);
    });
  }

  const statusColors = {
    "Pendiente": "#c18a32",
    "Confirmada": "#0a7d68",
    "Hospedado": "#44669b",
    "Completada": "#2b4f9e",
    "Cancelada":  "#b23a3a"
  };

  const statusCount = { "Pendiente": 0, "Confirmada": 0, "Hospedado": 0, "Completada": 0, "Cancelada": 0 };
  list.forEach(r => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });

  const statusContainer = document.getElementById("reportStatus");
  if (statusContainer) {
    statusContainer.innerHTML = "";
    Object.entries(statusCount).forEach(([s, c]) => {
      const div = document.createElement("div");
      div.className = "donut-item";
      div.innerHTML = `
        <span><span class="dot" style="background:${statusColors[s]}"></span>${s}</span>
        <b>${c}</b>
      `;
      statusContainer.appendChild(div);
    });
  }

  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-PE", { month: "short" }).replace(".", ""),
      count: 0
    });
  }

  list.forEach(r => {
    const key = (r.createdAt || r.checkin || "").slice(0, 7);
    const m = months.find(x => x.key === key);
    if (m) m.count++;
  });

  const maxMonth = Math.max(1, ...months.map(m => m.count));
  const monthContainer = document.getElementById("reportMonths");
  if (monthContainer) {
    monthContainer.innerHTML = "";
    months.forEach(m => {
      const div = document.createElement("div");
      div.className = "vbar";
      div.innerHTML = `
        <b>${m.count}</b>
        <div class="vfill" style="height:${(m.count / maxMonth) * 100}%"></div>
        <span>${m.label}</span>
      `;
      monthContainer.appendChild(div);
    });
  }
}

/* ============================================================
   FILTROS DE REPORTES Y GRÁFICO EXTENDIDO
   ============================================================ */
function initReportFilters() {
  const typeSelect = document.getElementById("reportPeriodType");
  const yearSelect = document.getElementById("reportYearFilter");
  const monthSelect = document.getElementById("reportMonthFilter");
  const weekInput = document.getElementById("reportWeekFilter");
  const btnFilter = document.getElementById("btnFilterReports");

  if (!yearSelect || !monthSelect || !weekInput || !typeSelect) return;

  if (yearSelect.options.length === 0) {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 2; y++) years.push(y);

    yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join("");

    const months = [
      { val: "1", label: "Enero" }, { val: "2", label: "Febrero" }, { val: "3", label: "Marzo" },
      { val: "4", label: "Abril" }, { val: "5", label: "Mayo" }, { val: "6", label: "Junio" },
      { val: "7", label: "Julio" }, { val: "8", label: "Agosto" }, { val: "9", label: "Septiembre" },
      { val: "10", label: "Octubre" }, { val: "11", label: "Noviembre" }, { val: "12", label: "Diciembre" }
    ];
    monthSelect.innerHTML = months.map(m => `<option value="${m.val}">${m.label}</option>`).join("");
    
    weekInput.value = computeTodayLocalISO();
  }

  typeSelect.addEventListener("change", () => {
    const val = typeSelect.value;
    yearSelect.style.display = (val === "year" || val === "month") ? "block" : "none";
    monthSelect.style.display = val === "month" ? "block" : "none";
    weekInput.style.display = val === "week" ? "block" : "none";
  });

  if (btnFilter) {
    btnFilter.addEventListener("click", renderReportsExtended);
  }
}

function renderReportsExtended() {
  const container = document.getElementById("reportMonthsRevenue");
  if (!container) return;

  const typeSelect = document.getElementById("reportPeriodType");
  const yearSelect = document.getElementById("reportYearFilter");
  const monthSelect = document.getElementById("reportMonthFilter");
  const weekInput = document.getElementById("reportWeekFilter");

  const type = typeSelect?.value || "year";
  const selectedYear = Number(yearSelect?.value || new Date().getFullYear());
  const selectedMonth = monthSelect?.value || "1"; 
  const selectedDate = weekInput?.value || computeTodayLocalISO();

  const reservations = loadReservations();
  const totalRooms = Object.values(ROOM_NUMBERING).reduce((s, arr) => s + arr.length, 0);

  let totalRevenue = 0;
  let totalPaid = 0;
  let totalCount = 0;
  let roomNightsSold = 0;
  let chartData = [];

  if (type === "year") {
    for (let i = 0; i < 12; i++) {
      const d = new Date(selectedYear, i, 1);
      chartData.push({
        key: `${selectedYear}-${String(i + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("es-PE", { month: "short" }).replace(".", ""),
        revenue: 0,
        count: 0
      });
    }
  } else if (type === "month") {
    const monthIndex = Number(selectedMonth) - 1;
    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      chartData.push({
        key: `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
        label: String(i),
        revenue: 0,
        count: 0
      });
    }
  } else if (type === "week") {
    const parts = selectedDate.split("-");
    const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    const dayOfWeek = baseDate.getDay() || 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - dayOfWeek + 1);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      chartData.push({
        key: toLocalDateInputValue(d),
        label: d.toLocaleDateString("es-PE", { weekday: "short" }),
        revenue: 0,
        count: 0
      });
    }
  }

  reservations.filter(r => r.status !== "Cancelada").forEach(r => {
    const dateRef = r.createdAt || r.checkin || "";
    const dateObj = new Date(dateRef);
    if (isNaN(dateObj.getTime())) return;

    let match = false;
    if (type === "year" && dateObj.getFullYear() === selectedYear) match = true;
    else if (type === "month" && dateObj.getFullYear() === selectedYear && (dateObj.getMonth() + 1) === Number(selectedMonth)) match = true;
    else if (type === "week" && chartData.some(c => c.key === toLocalDateInputValue(dateObj))) match = true;

    if (match) {
      const paid = getAmountPaid(r);
      const total = Number(r.total) || 0;
      
      totalPaid += paid;
      totalRevenue += total;
      totalCount++;
      
      const start = new Date(r.checkin + "T12:00:00");
      const end = new Date(r.checkout + "T12:00:00");
      if (end > start) {
        roomNightsSold += Math.round((end - start) / 86400000);
      }

      const keyToFind = type === "year" 
        ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`
        : toLocalDateInputValue(dateObj);

      const item = chartData.find(x => x.key === keyToFind);
      if (item) {
        item.revenue += total;
        item.count++;
      }
    }
  });

  // KPIs
  document.getElementById("repKpiRevenue12").textContent = "S/ " + totalRevenue.toLocaleString("es-PE");
  document.getElementById("repKpiRevenueSub").textContent = `Cobrado: S/ ${totalPaid.toLocaleString("es-PE")}`;
  document.getElementById("repKpiCount12").textContent = totalCount;
  
  let daysInPeriod = 365;
  if (type === "month") daysInPeriod = new Date(selectedYear, Number(selectedMonth), 0).getDate();
  if (type === "week") daysInPeriod = 7;
  
  const occupancy = totalRooms > 0 ? (roomNightsSold / (totalRooms * daysInPeriod)) * 100 : 0;
  document.getElementById("repKpiOccupancy").textContent = `${occupancy.toFixed(1)}%`;

  // Mejor mes/día
  const best = chartData.reduce((a, b) => (b.revenue > a.revenue ? b : a), chartData[0]);
  document.getElementById("repKpiBestMonth").textContent = best && best.revenue > 0 ? best.label.toUpperCase() : "—";
  document.getElementById("repKpiBestMonthSub").textContent = best && best.revenue > 0 ? `S/ ${best.revenue.toLocaleString("es-PE")}` : "sin datos";

  // Renderizar gráfico
  container.replaceChildren();
  const maxRev = Math.max(1, ...chartData.map(m => m.revenue));
  
  container.style.overflowX = "auto";
  container.style.justifyContent = chartData.length > 12 ? "flex-start" : "space-between";

  chartData.forEach(m => {
    const div = document.createElement("div");
    div.className = "vbar";
    const barWidth = type === "year" ? "60px" : (type === "month" ? "25px" : "50px"); 
    div.innerHTML = `
      <b style="font-size:${type === "month" ? '8px' : '10px'}">${m.revenue > 0 ? "S/ " + Math.round(m.revenue).toLocaleString("es-PE") : "—"}</b>
      <div class="vfill" style="height:${(m.revenue / maxRev) * 100}%; width:100%; max-width:${barWidth}"></div>
      <span style="font-size:${type === "month" ? '8px' : '9px'}">${m.label}</span>
    `;
    container.appendChild(div);
  });
}

// Exportar Ingresos filtrados
const exportRevenueMonthBtn = document.getElementById("exportRevenueMonth");
if (exportRevenueMonthBtn) {
  exportRevenueMonthBtn.addEventListener("click", () => {
    const typeSelect = document.getElementById("reportPeriodType");
    const yearSelect = document.getElementById("reportYearFilter");
    const monthSelect = document.getElementById("reportMonthFilter");
    const weekInput = document.getElementById("reportWeekFilter");

    const type = typeSelect?.value || "year";
    const selectedYear = Number(yearSelect?.value || new Date().getFullYear());
    const selectedMonth = monthSelect?.value || "1"; 
    const selectedDate = weekInput?.value || computeTodayLocalISO();

    const reservations = loadReservations();
    const rows = [["Periodo", "Reservas", "Ingresos Totales (S/)"]];

    let chartData = [];
    if (type === "year") {
      for (let i = 0; i < 12; i++) {
        const d = new Date(selectedYear, i, 1);
        chartData.push({ key: `${selectedYear}-${String(i + 1).padStart(2, "0")}`, label: d.toLocaleDateString("es-PE", { month: "long" }) });
      }
    } else if (type === "month") {
      const monthIndex = Number(selectedMonth) - 1;
      const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        chartData.push({ key: `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`, label: `${i} de ${new Date(selectedYear, monthIndex, 1).toLocaleDateString("es-PE", { month: "long" })}` });
      }
    } else if (type === "week") {
      const parts = selectedDate.split("-");
      const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayOfWeek = baseDate.getDay() || 7; 
      const monday = new Date(baseDate);
      monday.setDate(baseDate.getDate() - dayOfWeek + 1);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        chartData.push({ key: toLocalDateInputValue(d), label: d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" }) });
      }
    }

    chartData.forEach(c => {
      const subset = reservations.filter(r => {
        if (r.status === "Cancelada") return false;
        const dateRef = r.createdAt || r.checkin || "";
        if (type === "year") return dateRef.startsWith(c.key);
        return dateRef.startsWith(c.key); 
      });
      rows.push([
        c.label,
        subset.length,
        subset.reduce((s, r) => s + (getAmountPaid(r) || Number(r.total) || 0), 0).toFixed(2)
      ]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFFsep=;\n" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Suiza_ingresos_${type}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Ingresos exportados.");
  });
}


// ============================================================
//  EMPLEADOS: render + CRUD (CONECTADO A SPRING BOOT)
// ============================================================
let empleadosGlobales = [];

async function sincronizarEmpleadosDesdeBackend() {
  try {
    const respuesta = await fetch("https://hotelsuiza.onrender.com/api/empleados");
    if (!respuesta.ok) throw new Error("Error al obtener empleados");
    empleadosGlobales = await respuesta.json();
  } catch (error) {
    console.error("Error al sincronizar empleados:", error);
  }
}

function getEmployees() {
  return empleadosGlobales;
}

function currentAdminLabel() {
  const username = sessionStorage.getItem(ADMIN_USER_KEY);
  const emp = getEmployees().find(e => e.username === username);
  return emp?.label || username || "Administrador";
}

function renderEmployees() {
  const tbody = document.getElementById("employeeTable");
  if (!tbody) return;
  
  const list = getEmployees().slice().sort((a, b) => a.username.localeCompare(b.username));
  tbody.replaceChildren();

  if (!list.length) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = "empty-row";
    cell.textContent = "No hay empleados registrados en la nube.";
    return;
  }

  list.forEach(emp => {
    const row = tbody.insertRow();
    row.insertCell().innerHTML = `<b>${emp.username}</b>`;
    row.insertCell().textContent = emp.label;
    row.insertCell().textContent = emp.role;
    
    const statusCell = row.insertCell();
    const badge = document.createElement("span");
    badge.className = `badge ${emp.active ? "confirmada" : "cancelada"}`;
    badge.textContent = emp.active ? "Activo" : "Inactivo";
    statusCell.appendChild(badge);
    
    row.insertCell().textContent = emp.lastLoginAt
      ? new Date(emp.lastLoginAt).toLocaleString("es-PE")
      : "—";
      
    const actions = row.insertCell();
    actions.innerHTML = `
      <button class="row-edit" data-emp-edit="${emp.id}" title="Editar">✎</button>
      <button class="row-delete" data-emp-delete="${emp.id}" title="Eliminar">✕</button>
    `;
  });

  tbody.querySelectorAll("[data-emp-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const emp = getEmployees().find(e => e.id == btn.dataset.empEdit);
      if (emp) openEmployeeModal(emp);
    });
  });

  tbody.querySelectorAll("[data-emp-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.empDelete;
      const emp = getEmployees().find(e => e.id == id);
      if (!emp) return;

      if (emp.username === sessionStorage.getItem(ADMIN_USER_KEY)) {
        showToast("No puedes eliminar el usuario con el que estás conectado.");
        return;
      }
      
      const confirm = await showAppDialog({
        title: "Eliminar empleado",
        message: `¿Eliminar definitivamente al usuario "${emp.username}"?`,
        confirmText: "Eliminar",
        cancelText: "Conservar",
        danger: true
      });
      if (!confirm) return;

      try {
        const res = await fetch(`https://hotelsuiza.onrender.com/api/empleados/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        await sincronizarEmpleadosDesdeBackend();
        renderEmployees();
        recordAdminEvent(currentAdminLabel(), `Eliminó al empleado ${emp.username}`);
        showToast("Empleado eliminado de la nube.");
      } catch (error) {
        showToast("Error al eliminar empleado.");
      }
    });
  });

  const accessLog = document.getElementById("employeeAccessLog");
  if (accessLog) {
    const log = loadAdminActivity().slice(0, 8);
    accessLog.innerHTML = "";
    if (!log.length) {
      accessLog.innerHTML = `<div class="mini-item"><span class="mi-sub">Sin accesos recientes.</span></div>`;
    } else {
      log.forEach(entry => {
        const div = document.createElement("div");
        div.className = "mini-item";
        const date = new Date(entry.timestamp);
        div.innerHTML = `
          <div>
            <span class="mi-name">${entry.username || "—"}</span>
            <span class="mi-sub">${entry.action || "Acceso"}</span>
          </div>
          <span class="mi-sub">${Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-PE")}</span>
        `;
        accessLog.appendChild(div);
      });
    }
  }
}

let editingEmployeeId = null;
const employeeModal = document.getElementById("employeeModal");

function openEmployeeModal(emp = null) {
  editingEmployeeId = emp ? emp.id : null;
  const titleEl = document.getElementById("employeeModalTitle");
  const errEl = document.getElementById("empError");
  const form = document.getElementById("employeeForm");
  const userInput = document.getElementById("empUsername");
  const passInput = document.getElementById("empPassword");

  if (titleEl) titleEl.textContent = emp ? "Editar empleado" : "Nuevo empleado";
  if (errEl) errEl.textContent = "";
  if (form) form.reset();
  
  const activeCheck = document.getElementById("empActive");
  if (activeCheck) activeCheck.checked = true;

  if (emp) {
    userInput.value = emp.username;
    userInput.disabled = true;
    document.getElementById("empLabel").value = emp.label;
    document.getElementById("empRole").value = emp.role;
    activeCheck.checked = emp.active;
    passInput.placeholder = "(Dejar en blanco para no cambiar)";
  } else {
    userInput.disabled = false;
    passInput.placeholder = "";
  }

  employeeModal.classList.add("open");
  employeeModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeEmployeeModal() {
  employeeModal.classList.remove("open");
  employeeModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  editingEmployeeId = null;
}

document.querySelectorAll("[data-employee-close]").forEach(el =>
  el.addEventListener("click", closeEmployeeModal)
);

const addEmployeeBtn = document.getElementById("addEmployeeBtn");
if (addEmployeeBtn) addEmployeeBtn.addEventListener("click", () => openEmployeeModal());

const employeeForm = document.getElementById("employeeForm");
if (employeeForm) {
  employeeForm.addEventListener("submit", async event => {
    event.preventDefault();
    const username = document.getElementById("empUsername").value.trim();
    const label = document.getElementById("empLabel").value.trim();
    const password = document.getElementById("empPassword").value;
    const role = document.getElementById("empRole").value;
    const active = document.getElementById("empActive").checked;
    const err = document.getElementById("empError");
    err.textContent = "";

    if (!editingEmployeeId && password.length < 6) {
      err.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }

    const bodyData = { username, label, role: role, active: String(active), password };

    try {
      if (editingEmployeeId) {
        const res = await fetch(`https://hotelsuiza.onrender.com/api/empleados/${editingEmployeeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
        if (!res.ok) throw new Error();
        recordAdminEvent(currentAdminLabel(), `Actualizó al empleado ${username}`);
        showToast("Empleado actualizado en la nube.");
      } else {
        const res = await fetch("https://hotelsuiza.onrender.com/api/empleados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
        if (!res.ok) throw new Error();
        recordAdminEvent(currentAdminLabel(), `Creó al empleado ${username}`);
        showToast("Empleado creado en la nube.");
      }
      
      await sincronizarEmpleadosDesdeBackend();
      closeEmployeeModal();
      renderEmployees();
    } catch (error) {
      err.textContent = "Error al guardar en el servidor.";
    }
  });
}


// ============================================================
//  TABLERO DE HABITACIONES
// ============================================================
function renderRoomsBoard() {
  const container = document.getElementById("roomsBoard");
  if (!container) return;
  const input = document.getElementById("roomsBoardDate");
  const date = input.value || computeTodayLocalISO();
  input.value = date;

  const reservations = loadReservations().filter(r =>
    r.assignedRoomNumber &&
    r.status !== "Cancelada" &&
    r.status !== "Completada" &&
    r.checkin <= date && r.checkout > date
  );
  const byRoom = new Map(reservations.map(r => [r.assignedRoomNumber, r]));

  container.replaceChildren();
  let total = 0;
  let occupied = 0;

  Object.entries(ROOM_NUMBERING).forEach(([category, numbers]) => {
    numbers.forEach(num => {
      total++;
      const guest = byRoom.get(num);
      if (guest) occupied++;

      const tile = document.createElement("div");
      tile.className = `room-tile ${guest ? "is-occupied" : "is-available"}`;

      const head = document.createElement("div");
      head.className = "room-tile-head";
      head.innerHTML = `
        <span class="room-tile-number">N° ${num}</span>
        <span class="room-tile-cat">${category.split(" ")[0]}</span>
      `;
      tile.appendChild(head);

      const status = document.createElement("span");
      status.className = `room-tile-status ${guest ? "occupied" : ""}`;
      status.textContent = guest ? "Ocupada" : "Disponible";
      tile.appendChild(status);

      if (guest) {
        const g = document.createElement("p");
        g.className = "room-tile-guest";
        g.innerHTML = `
          <b>${guest.name}</b>
          <small>${guest.checkin} → ${guest.checkout}</small>
          <small>Reserva ${guest.id}</small>
        `;
        tile.appendChild(g);
      }
      container.appendChild(tile);
    });
  });

  const count = document.getElementById("roomsBoardCount");
  if (count) count.textContent = `${occupied}/${total} ocupadas · ${date}`;
}

const roomsBoardDateInput = document.getElementById("roomsBoardDate");
if (roomsBoardDateInput) {
  roomsBoardDateInput.value = computeTodayLocalISO();
  roomsBoardDateInput.addEventListener("change", renderRoomsBoard);
}


// ============================================================
//  ASIGNAR HABITACIÓN (modal reutilizable)
// ============================================================
const roomAssignModal = document.getElementById("roomAssignModal");
let pendingAssignReservation = null;

function openRoomAssignModal(reservation) {
  pendingAssignReservation = reservation;
  const info = document.getElementById("roomAssignInfo");
  const options = document.getElementById("roomAssignOptions");
  const error = document.getElementById("roomAssignError");
  error.textContent = "";
  info.textContent = `${reservation.name} · ${reservation.room} · ${reservation.checkin} → ${reservation.checkout}`;
  options.replaceChildren();

  const available = getAvailableRoomNumbers(reservation);
  if (!available.length) {
    options.innerHTML = `<p style="color:#b23a3a;font-size:12px;">No hay habitaciones físicas disponibles para esas fechas en esta categoría.</p>`;
  } else {
    available.forEach(num => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "room-assign-btn";
      btn.textContent = num;
      btn.addEventListener("click", () => confirmRoomAssignment(num));
      options.appendChild(btn);
    });
  }

  roomAssignModal.classList.add("open");
  roomAssignModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeRoomAssignModal() {
  roomAssignModal.classList.remove("open");
  roomAssignModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  pendingAssignReservation = null;
}

document.querySelectorAll("[data-room-assign-close]").forEach(el =>
  el.addEventListener("click", closeRoomAssignModal)
);

async function confirmRoomAssignment(roomNumber) {
  if (!pendingAssignReservation) return;
  
  const item = loadReservations().find(r => r.id === pendingAssignReservation.id);
  if (!item) { closeRoomAssignModal(); return; }

  const nuevaData = {
    status: item.status,
    paymentStatus: item.paymentStatus,
    amountPaid: item.amountPaid,
    balanceDue: item.balanceDue,
    assignedRoomNumber: roomNumber,
    checkedInAt: formatearFechaJava(item.checkedInAt),
    checkedOutAt: formatearFechaJava(item.checkedOutAt)
  };

  const targetId = item.databaseId || item.id;

  try {
    const respuesta = await fetch(`https://hotelsuiza.onrender.com/api/reservas/${targetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaData)
    });
    if (!respuesta.ok) throw new Error();

    showToast(`Habitación ${roomNumber} asignada.`);
    closeRoomAssignModal();

    try {
      await sincronizarReservasDesdeBackend();
      renderAdmin();
    } catch (visualError) { console.error("Fallo visual:", visualError); }

  } catch (error) {
    console.error("Error al asignar habitación:", error);
    showToast("Error al asignar habitación.");
  }
}


// ============================================================
//  EXPORTAR RESERVAS
// ============================================================

const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");
const EXPORT_HEADERS = [
  "Código", "Huésped", "Email", "Teléfono", "Habitación", "N° Hab.",
  "Entrada", "Salida", "Noches", "Huéspedes",
  "Precio/noche", "Total", "Código de recepción", "Adelanto", "Pagado", "Operación Yape",
  "Método de pago", "Estado de pago", "Estado", "Entrada registrada", "Salida registrada", "Registrada"
];

const JPG_COL_WIDTHS = [
  70, 130, 150, 100, 120, 60, 80, 80, 50, 70,
  80, 80, 120, 80, 80, 110, 100, 100, 80, 110, 110, 120
];

exportBtn.addEventListener("click", event => {
  event.stopPropagation();
  const isOpen = exportMenu.classList.toggle("show");
  exportBtn.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", event => {
  if (!document.getElementById("exportDropdown").contains(event.target)) {
    exportMenu.classList.remove("show");
    exportBtn.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    exportMenu.classList.remove("show");
    exportBtn.setAttribute("aria-expanded", "false");
  }
});

exportMenu.addEventListener("click", event => {
  const option = event.target.closest("[data-export-format]");
  if (!option) return;
  event.preventDefault();
  exportMenu.classList.remove("show");
  exportBtn.setAttribute("aria-expanded", "false");
  const format = option.dataset.exportFormat;
  if (format === "guests") {
    exportGuestsCSV();
  } else {
    exportReservations(format);
  }
});

function exportReservations(format = "csv") {
  const list = loadReservations();

  if (!list.length) {
    showToast("No hay reservas para exportar.");
    return;
  }

  const rows = list.map(r => [
    r.id, r.name, r.email, r.phone, r.room, r.assignedRoomNumber || "",
    r.checkin, r.checkout, r.nights, r.guests, r.price, r.total, r.receiptCode || "",
    r.depositAmount ?? (Number(r.total) / 2), getAmountPaid(r), r.paymentReference || "",
    r.paymentMethod || "Pago en el hotel", r.paymentStatus || "Pendiente", r.status,
    formatStayTimestamp(r.checkedInAt), formatStayTimestamp(r.checkedOutAt),
    r.createdAt ? new Date(r.createdAt).toLocaleString("es-PE") : ""
  ]);

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "jpg") {
    exportReservationsDocument(format, list, stamp);
    return;
  }

  const csv = [EXPORT_HEADERS, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  const blob = new Blob(["\uFEFFsep=;\n" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Suiza_reservas_${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`✓ ${list.length} reservas exportadas a CSV.`);
}

function exportGuestsCSV() {
  const reservations = loadReservations();
  if (!reservations.length) {
    showToast("No hay huéspedes para exportar.");
    return;
  }

  const map = new Map();
  reservations.forEach(r => {
    const key = (r.email || r.name || "").toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name: r.name || "—",
        email: r.email || "—",
        phone: r.phone || "—",
        count: 0,
        spent: 0,
        firstStay: r.checkin,
        lastStay: r.checkout,
        status: "—"
      });
    }
    const g = map.get(key);
    g.count++;
    if (r.status !== "Cancelada") g.spent += getAmountPaid(r);
    if (r.checkin && r.checkin < g.firstStay) g.firstStay = r.checkin;
    if (r.checkout && r.checkout > g.lastStay) g.lastStay = r.checkout;
    if (r.status === "Hospedado") g.status = "En hotel";
    else if (r.status === "Confirmada" && g.status !== "En hotel") g.status = "Próxima";
  });

  const headers = ["Huésped", "Email", "Teléfono", "Reservas", "Gastado (S/)", "Primera estadía", "Última estadía", "Estado actual"];
  const rows = [...map.values()].map(g => [
    g.name, g.email, g.phone, g.count,
    g.spent.toFixed(2), g.firstStay || "—", g.lastStay || "—", g.status
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFFsep=;\n" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Suiza_huespedes_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`${rows.length} huéspedes exportados.`);
}

function buildReservationsExport(list) {
  const report = document.createElement("section");
  report.style.cssText = "position:fixed;left:-12000px;top:0;width:2100px;padding:40px;background:#fff;color:#172b3d;font:12px Arial,sans-serif;z-index:-1";

  const title = document.createElement("h1");
  title.textContent = "HOTEL SUIZA — Reporte de reservas";
  title.style.cssText = "margin:0 0 10px;font-size:28px";
  report.appendChild(title);

  const summary = document.createElement("p");
  summary.textContent = `Total de reservas: ${list.length} · Generado: ${new Date().toLocaleString("es-PE")}`;
  summary.style.cssText = "margin:0 0 30px;color:#667482;font-size:14px";
  report.appendChild(summary);

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px";
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  
  EXPORT_HEADERS.forEach((label, i) => {
    const cell = document.createElement("th");
    cell.textContent = label;
    cell.style.cssText = `padding:10px 6px;background:#102235;color:#fff;text-align:left;border:1px solid #dce1e8;width:${JPG_COL_WIDTHS[i]}px;word-break:break-word;`;
    headerRow.appendChild(cell);
  });
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  list.forEach((reservation, index) => {
    const values = [
      reservation.id, reservation.name, reservation.email, reservation.phone,
      reservation.room, reservation.assignedRoomNumber || "—",
      reservation.checkin, reservation.checkout,
      reservation.nights, reservation.guests, `S/ ${reservation.price ?? ""}`,
      `S/ ${reservation.total ?? ""}`, reservation.receiptCode || "",
      `S/ ${reservation.depositAmount ?? (Number(reservation.total) / 2)}`,
      `S/ ${getAmountPaid(reservation)}`, reservation.paymentReference || "",
      reservation.paymentMethod || "Pago en el hotel",
      reservation.paymentStatus || "Pendiente", reservation.status,
      formatStayTimestamp(reservation.checkedInAt), formatStayTimestamp(reservation.checkedOutAt),
      reservation.createdAt ? new Date(reservation.createdAt).toLocaleString("es-PE") : ""
    ];
    const row = document.createElement("tr");
    if (index % 2 === 0) row.style.background = "#f9fbfd";
    
    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value == null ? "" : String(value);
      cell.style.cssText = `padding:8px 6px;border:1px solid #dce1e8;vertical-align:top;word-break:break-word;line-height:1.3;`;
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  table.appendChild(body);
  report.appendChild(table);
  document.body.appendChild(report);
  return report;
}

async function exportReservationsDocument(format, list, stamp) {
  const report = buildReservationsExport(list);
  try {
    if (typeof html2canvas !== "function") {
      throw new Error("No se pudo cargar el generador de imágenes.");
    }

    const canvas = await html2canvas(report, {
      scale: 1.5,
      backgroundColor: "#ffffff",
      windowWidth: report.scrollWidth,
      scrollX: 0,
      scrollY: 0
    });

    const link = document.createElement("a");
    link.download = `Suiza_reservas_${stamp}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
    showToast(`✓ ${list.length} reservas exportadas a JPG.`);
  } catch (error) {
    console.error("Error al exportar reservas a JPG:", error);
    showToast("No se pudo generar el archivo JPG. Inténtalo nuevamente.");
  } finally {
    report.remove();
  }
}


/* ============================================================
   SISTEMA DE USUARIOS (CONECTADO A SPRING BOOT)
   ============================================================ */
const USER_SESS = "suiza_user_session";

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(USER_SESS)); }
  catch { return null; }
}
function setCurrentUser(user) {
  if (user) localStorage.setItem(USER_SESS, JSON.stringify(user));
  else localStorage.removeItem(USER_SESS);
  updateNavAccount();
}
function updateMyReservationsButton() {
  const button = document.getElementById("navMyReservations");
  button.hidden = !getCurrentUser() && !sessionStorage.getItem(RESERVATION_LOOKUP_EMAIL);
}
function updateNavAccount() {
  const btn  = document.getElementById("navAccount");
  const text = document.getElementById("navAccountText");
  const accountMenu = document.getElementById("accountMenu");
  const user = getCurrentUser();
  if (user) {
    btn.classList.add("logged");
    text.textContent = `👤 ${user.name.split(" ")[0]}`;
    document.getElementById("accountMenuName").textContent = user.name;
    document.getElementById("accountMenuEmail").textContent = user.email;
    const directName = document.getElementById("resName");
    const directEmail = document.getElementById("resEmail");
    const modalName = document.getElementById("rName");
    const modalEmail = document.getElementById("rEmail");
    if (directName && !directName.value) directName.value = user.name;
    if (directEmail && !directEmail.value) directEmail.value = user.email;
    if (modalName && !modalName.value) modalName.value = user.name;
    if (modalEmail && !modalEmail.value) modalEmail.value = user.email;
  } else {
    btn.classList.remove("logged");
    text.textContent = "Mi cuenta";
    accountMenu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }
  updateMyReservationsButton();
}

document.getElementById("navAccount").addEventListener("click", () => {
  const user = getCurrentUser();
  if (user) {
    const button = document.getElementById("navAccount");
    const accountMenu = document.getElementById("accountMenu");
    accountMenu.hidden = !accountMenu.hidden;
    button.setAttribute("aria-expanded", String(!accountMenu.hidden));
  } else {
    openAuthModal("login");
  }
});

document.getElementById("accountLogout").addEventListener("click", () => {
  sessionStorage.removeItem(RESERVATION_LOOKUP_EMAIL);
  setCurrentUser(null);
  updatePreviewLockState();
});

document.addEventListener("click", event => {
  const accountMenu = document.getElementById("accountMenu");
  const accountButton = document.getElementById("navAccount");
  if (!event.target.closest(".account-menu-wrap") && !accountMenu.hidden) {
    accountMenu.hidden = true;
    accountButton.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    const accountMenu = document.getElementById("accountMenu");
    accountMenu.hidden = true;
    document.getElementById("navAccount").setAttribute("aria-expanded", "false");
  }
});


/* ============================================================
   POPUP PEQUEÑO DE HABITACIÓN
   ============================================================ */
const roomBrief = {
  "Habitación Simple": "Acogedora y funcional, ideal para viajeros solos o parejas que buscan descanso.",
  "Habitación Doble":  "Espacio perfecto para compartir, con dos camas confortables y luz natural.",
  "Deluxe Premium":    "Diseño sofisticado y amplitud para una estadía especial con amenities premium.",
  "Suite Suiza":       "Nuestra experiencia más exclusiva, con sala independiente y detalles de lujo."
};

const roomPreviewModal = document.getElementById("roomPreview");
let currentCardButton = null;
let lastPreviewRoom   = null;

function openPreview(roomName) {
  const card = [...document.querySelectorAll(".room-card")]
    .find(c => c.querySelector("h3").textContent === roomName);
  if (!card) return;

  currentRoom       = roomName;
  currentCardButton = card.querySelector(".room-link");

  document.getElementById("previewImage").src = ROOM_IMAGES[roomName][0];
  document.getElementById("previewImage").alt = roomName;
  document.getElementById("previewTitle").textContent = roomName;
  document.getElementById("previewTag").textContent   = card.querySelector(".room-tag").textContent;
  document.getElementById("previewText").textContent  = roomBrief[roomName];
  document.getElementById("previewPrice").innerHTML   =
    `S/ ${ROOM_PRICES[roomName]} <small>/ noche</small>`;

  updatePreviewLockState();

  roomPreviewModal.classList.add("open");
  roomPreviewModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function updatePreviewLockState() {
  document.getElementById("previewLock").style.display = getCurrentUser() ? "none" : "block";
  document.getElementById("previewUnlocked").style.display = "block";
}

function closePreview() {
  roomPreviewModal.classList.remove("open");
  roomPreviewModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-pclose]").forEach(el => {
  el.addEventListener("click", closePreview);
});

document.getElementById("previewLogin").addEventListener("click", () => {
  closePreview();
  openAuthModal("register");
});

document.getElementById("previewFull").addEventListener("click", () => {
  closePreview();
  if (currentCardButton) openRoom(currentCardButton);
});

document.getElementById("previewReserve").addEventListener("click", () => {
  closePreview();
  const user = getCurrentUser();
  if (user) {
    document.getElementById("rName").value  = user.name;
    document.getElementById("rEmail").value = user.email;
  }
  openReserveModal(currentRoom);
});


/* ============================================================
   AUTH MODAL (login / registro)
   ============================================================ */
const authModal = document.getElementById("authModal");

function openAuthModal(tab = "login") {
  authModal.classList.add("open");
  authModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  switchAuthTab(tab);
}
function closeAuthModal() {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.getElementById("userLoginError").textContent = "";
  document.getElementById("regError").textContent = "";
}
function switchAuthTab(name) {
  document.querySelectorAll(".auth-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.authTab === name)
  );
  document.querySelectorAll(".auth-form").forEach(f =>
    f.classList.toggle("active", f.dataset.authView === name)
  );
}

document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => switchAuthTab(tab.dataset.authTab));
});
document.querySelectorAll("[data-aclose]").forEach(el => {
  el.addEventListener("click", closeAuthModal);
});

document.getElementById("forgotPasswordLink").addEventListener("click", () => {
  const email = document.getElementById("userLoginEmail").value.trim().toLowerCase();
  closeAuthModal();
  openPasswordResetModal(email);
});

// 🔥 LOGIN DE CLIENTES CON SPRING BOOT
document.getElementById("userLoginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("userLoginEmail").value.trim().toLowerCase();
  const pass  = document.getElementById("userLoginPass").value;
  const err   = document.getElementById("userLoginError");
  err.textContent = "";

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = "Iniciando...";
  btn.disabled = true;

  try {
    const res = await fetch("https://hotelsuiza.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();

    if (res.ok) {
      setCurrentUser({ name: data.nombre, email: data.email });
      closeAuthModal();
      e.target.reset();
      showToast(`¡Bienvenido, ${data.nombre.split(" ")[0]}!`);
    } else {
      err.textContent = data.message || "Credenciales incorrectas.";
    }
  } catch (error) {
    console.error(error);
    err.textContent = "Error de conexión con el servidor.";
  } finally {
    btn.textContent = "Iniciar sesión";
    btn.disabled = false;
  }
});

// 🔥 REGISTRO DE CLIENTES CON SPRING BOOT
document.getElementById("registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name  = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const pass  = document.getElementById("regPass").value;
  const err   = document.getElementById("regError");
  err.textContent = "";

  if (pass.length < 6) {
    err.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = "Enviando correo...";
  btn.disabled = true;

  try {
    const res = await fetch("https://hotelsuiza.onrender.com/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: name, email, password: pass, telefono: "" })
    });

    const data = await res.json();

    if (res.ok) {
      closeAuthModal();
      document.getElementById("verifyEmail").textContent = email;
      document.getElementById("verifyCode").value = "";
      document.getElementById("verifyModal").classList.add("open");
      document.getElementById("verifyModal").setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      document.getElementById("verifyHint").textContent = "Revisa tu bandeja de entrada (y spam) para encontrar el código.";
      e.target.reset();
    } else {
      err.textContent = data.message || "Error al registrar usuario.";
    }
  } catch (error) {
    console.error(error);
    err.textContent = "Error de conexión con el servidor.";
  } finally {
    btn.textContent = "Crear cuenta";
    btn.disabled = false;
  }
});


/* ============================================================
   VERIFICACIÓN DE CÓDIGO
   ============================================================ */
document.getElementById("verifyForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("verifyEmail").textContent.trim();
  const code = document.getElementById("verifyCode").value.trim();
  const hint = document.getElementById("verifyHint");

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = "Verificando...";
  btn.disabled = true;

  try {
    const res = await fetch("https://hotelsuiza.onrender.com/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, codigo: code })
    });

    const data = await res.json();

    if (res.ok) {
      setCurrentUser({ name: data.nombre, email: data.email });
      closeVerifyModal();
      showToast("¡Cuenta verificada y creada con éxito!");
    } else {
      hint.textContent = data.message || "Código incorrecto.";
    }
  } catch (error) {
    console.error(error);
    hint.textContent = "Error de conexión con el servidor.";
  } finally {
    btn.textContent = "Verificar cuenta";
    btn.disabled = false;
  }
});

function closeVerifyModal() {
  document.getElementById("verifyModal").classList.remove("open");
  document.getElementById("verifyModal").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
document.querySelectorAll("[data-vclose]").forEach(el => {
  el.addEventListener("click", closeVerifyModal);
});

const passwordResetModal = document.getElementById("passwordResetModal");
const passwordResetHint = document.getElementById("passwordResetHint");
const passwordResetVerifyForm = document.getElementById("passwordResetVerifyForm");
let resetEmailContext = "";

function openPasswordResetModal(email = "") {
  resetEmailContext = email;
  document.getElementById("passwordResetRequestForm").reset();
  passwordResetVerifyForm.reset();
  passwordResetVerifyForm.hidden = true;
  document.getElementById("passwordResetEmail").value = email;
  passwordResetHint.textContent = "";
  passwordResetModal.classList.add("open");
  passwordResetModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closePasswordResetModal() {
  passwordResetModal.classList.remove("open");
  passwordResetModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-pwclose]").forEach(element => {
  element.addEventListener("click", closePasswordResetModal);
});

document.getElementById("passwordResetBack").addEventListener("click", () => {
  closePasswordResetModal();
  openAuthModal("login");
});

// 🔥 SOLICITAR RECUPERACIÓN DE CONTRASEÑA
document.getElementById("passwordResetRequestForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.getElementById("passwordResetEmail").value.trim().toLowerCase();
  resetEmailContext = email;
  const requestButton = event.currentTarget.querySelector('button[type="submit"]');
  
  requestButton.disabled = true;
  passwordResetHint.textContent = "Enviando solicitud...";

  try {
    const res = await fetch("https://hotelsuiza.onrender.com/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    passwordResetVerifyForm.hidden = false;
    document.getElementById("passwordResetCode").value = "";
    document.getElementById("passwordResetNewPassword").value = "";
    
    if (res.ok) {
      passwordResetHint.textContent = "Si el correo está registrado, recibirás un código. Revisa también la carpeta de spam.";
    } else {
      passwordResetHint.textContent = data.message || "Error al enviar el código.";
    }
  } catch (error) {
    console.error(error);
    passwordResetHint.textContent = "Error de conexión con el servidor.";
  } finally {
    requestButton.disabled = false;
  }
});

// 🔥 CAMBIAR CONTRASEÑA
passwordResetVerifyForm.addEventListener("submit", async event => {
  event.preventDefault();
  const enteredCode = document.getElementById("passwordResetCode").value.trim();
  const newPassword = document.getElementById("passwordResetNewPassword").value;
  const btn = event.target.querySelector('button[type="submit"]');

  if (newPassword.length < 6) {
    passwordResetHint.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  btn.disabled = true;
  passwordResetHint.textContent = "Verificando...";

  try {
    const res = await fetch("https://hotelsuiza.onrender.com/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmailContext, codigo: enteredCode, password: newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      closePasswordResetModal();
      openAuthModal("login");
      document.getElementById("userLoginEmail").value = resetEmailContext;
      showToast("Contraseña actualizada. Ya puedes iniciar sesión.");
    } else {
      passwordResetHint.textContent = data.message || "Código incorrecto.";
    }
  } catch (error) {
    console.error(error);
    passwordResetHint.textContent = "Error de conexión con el servidor.";
  } finally {
    btn.disabled = false;
  }
});


/* ============================================================
   CAROUSEL DE HABITACIONES
   ============================================================ */
const roomGrid = document.getElementById("roomGrid");
const prevRoomBtn = document.getElementById("prevRoom");
const nextRoomBtn = document.getElementById("nextRoom");

function updateCarouselArrows() {
  if (!prevRoomBtn || !nextRoomBtn) return;
  prevRoomBtn.disabled = roomGrid.scrollLeft <= 4;
  nextRoomBtn.disabled = roomGrid.scrollLeft >= roomGrid.scrollWidth - roomGrid.clientWidth - 4;
}

function showRoomCategory(category) {
  const selectedTab = [...tabs].find(tab => tab.dataset.target === category);
  if (!selectedTab) return;

  rooms.forEach(room => room.classList.toggle("hidden", room.dataset.category !== category));
  tabs.forEach(tab => {
    const active = tab === selectedTab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  roomGrid.scrollLeft = 0;
  updateCarouselArrows();
}

function scrollRoomCards(direction) {
  const visibleCard = [...rooms].find(room => !room.classList.contains("hidden"));
  if (!visibleCard) return;

  const gap = Number.parseFloat(getComputedStyle(roomGrid).gap) || 0;
  roomGrid.scrollBy({
    left: direction * (visibleCard.getBoundingClientRect().width + gap),
    behavior: "smooth"
  });
}

tabs.forEach(tab => {
  tab.addEventListener("click", () => showRoomCategory(tab.dataset.target));
});

prevRoomBtn.addEventListener("click", () => scrollRoomCards(-1));
nextRoomBtn.addEventListener("click", () => scrollRoomCards(1));

roomGrid.addEventListener("scroll", updateCarouselArrows);
window.addEventListener("resize", updateCarouselArrows);
showRoomCategory(tabs[0].dataset.target);


/* ============================================================
   CONECTAR BOTONES DE LAS TARJETAS AL POPUP
   ============================================================ */
document.querySelectorAll(".room-link, .view-image").forEach(btn => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".room-card");
    const name = card.querySelector("h3").textContent;
    openPreview(name);
  });
});


/* ============================================================
   CARRUSEL DE PORTADA (HERO) — cada 3 segundos
   ============================================================ */
(function initHeroCarousel() {
  const slides = document.querySelectorAll(".hero-slide");
  const heroEl = document.querySelector(".hero");
  if (!slides.length || !heroEl) return;

  let index = 0;
  let timer = null;
  const INTERVAL = 3000;

  function nextSlide() {
    slides[index].classList.remove("active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("active");
  }

  function start() {
    if (slides.length < 2) return;
    timer = setInterval(nextSlide, INTERVAL);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  start();

  heroEl.addEventListener("mouseenter", stop);
  heroEl.addEventListener("mouseleave", start);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
})();


/* ============================================================
   FORMULARIO DE RESERVA DIRECTA (CONECTADO A SPRING BOOT)
   ============================================================ */
if (supabaseForm) {
  supabaseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    refreshLocalDate();

    if (!validateCapacity()) return;

    const btn = document.getElementById("supabaseSubmitBtn");
    const originalText = btn.textContent;

    const name = document.getElementById("resName").value.trim();
    const email = document.getElementById("resEmail").value.trim();
    const phone = document.getElementById("resPhone").value.trim();
    const checkinVal = resCheckin.value;
    const checkoutVal = resCheckout.value;
    const roomVal = resRoomSelect.value;
    const guests = document.getElementById("resGuests").value;
    const paymentReference = document.getElementById("resPaymentReference").value.trim();

    if (checkoutVal <= checkinVal) {
      showToast("La fecha de salida debe ser posterior a la de entrada.");
      return;
    }

    if (!document.getElementById("resPolicyAccepted").checked || !paymentReference) {
      showToast("Acepta las políticas e ingresa el número de operación de Yape.");
      return;
    }

    if (!checkAvailability(roomVal, checkinVal, checkoutVal)) {
      showToast("❌ No quedan habitaciones de este tipo disponibles en las fechas seleccionadas.");
      return;
    }

    btn.textContent = "Enviando a la nube...";
    btn.disabled = true;

    const nights = calcNights(checkinVal, checkoutVal);
    const price = ROOM_PRICES[roomVal];
    const total = nights * price;

    // Datos que recibe Java (Spring Boot)
    const nuevaReserva = {
      name: name,
      email: email,
      phone: phone,
      room: roomVal,
      checkin: checkinVal,
      checkout: checkoutVal,
      guests: guests + " huésped" + (guests === "1" ? "" : "es"),
      nights: nights,
      price: price,
      total: total,
      depositAmount: total / 2,
      balanceDue: total / 2,
      paymentReference: paymentReference,
      paymentMethod: "Yape",
      paymentStatus: "Adelanto por verificar",
      status: "Pendiente",
      createdAt: new Date().toISOString()
    };

    let syncMessage = "";

    try {
      // LLAMADO A LA API DE SPRING BOOT
      const respuesta = await fetch("https://hotelsuiza.onrender.com/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaReserva)
      });

      if (!respuesta.ok) throw new Error("Error al guardar en el servidor");

      const reservaGuardada = await respuesta.json();
      syncMessage = "Solicitud enviada al Hotel Suiza. El adelanto debe verificarse manualmente.";

      supabaseForm.reset();
      updateDirectPrice();
      
      await sincronizarReservasDesdeBackend();
      const reservaFinal = loadReservations().find(r => String(r.databaseId) === String(reservaGuardada.id)) || reservaGuardada;

      openReservationReceipt(reservaFinal, syncMessage);

    } catch (error) {
      console.error("No se pudo sincronizar la reserva con el servidor:", error);
      showToast("❌ No se pudo conectar con el servidor. Intenta más tarde.");
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}


/* ============================================================
   FAQ ACORDEÓN
   ============================================================ */
const faqQuestions = document.querySelectorAll(".faq-question");
faqQuestions.forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const answer = btn.nextElementSibling;

    document.querySelectorAll(".faq-item").forEach(otherItem => {
      if (otherItem !== item && otherItem.classList.contains("active")) {
        otherItem.classList.remove("active");
        otherItem.querySelector(".faq-answer").style.maxHeight = null;
      }
    });

    item.classList.toggle("active");

    if (item.classList.contains("active")) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    } else {
      answer.style.maxHeight = null;
    }
  });
});

/* ============================================================
   ASISTENTE DE AYUDA AL CLIENTE
   ============================================================ */
const supportChatPanel = document.getElementById("supportChatPanel");
const supportChatLauncher = document.getElementById("supportChatLauncher");
const supportChatMessages = document.getElementById("supportChatMessages");
const supportChatForm = document.getElementById("supportChatForm");
const supportChatInput = document.getElementById("supportChatInput");

function setSupportChatOpen(open) {
  supportChatPanel.hidden = !open;
  supportChatLauncher.setAttribute("aria-expanded", String(open));
  if (open) supportChatInput.focus();
}

function normalizeSupportQuestion(question) {
  return question.toLocaleLowerCase("es").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!,.;:]/g, " ");
}

function getSupportAnswer(question) {
  const text = normalizeSupportQuestion(question);
  const rooms = [
    { terms: ["simple", "individual"], name: "Habitación Simple", price: 180, capacity: "1 a 2 huéspedes" },
    { terms: ["doble", "dos camas"], name: "Habitación Doble", price: 260, capacity: "2 a 3 huéspedes" },
    { terms: ["deluxe", "premium"], name: "Deluxe Premium", price: 340, capacity: "2 huéspedes" },
    { terms: ["suite", "suiza"], name: "Suite Suiza", price: 490, capacity: "2 a 4 huéspedes" }
  ];

  if (/(olvid(e|é)|recuper(ar|ación)|restablecer).*(contraseña|clave)|(contraseña|clave).*(olvid(e|é)|recuper(ar|ación))/.test(text)) {
    return "En «Mi cuenta», pulsa «¿Olvidaste tu contraseña?», ingresa el correo registrado y solicita el código. En el modo de demostración el código se muestra en pantalla; el envío por correo requiere configurar EmailJS.";
  }

  if (/(registr|crear cuenta|crear usuario|abrir cuenta|cuenta nueva)/.test(text)) {
    return "Para registrarte, pulsa «Mi cuenta» en el menú y elige «Crear cuenta». Ingresa tu nombre, correo y una contraseña de al menos 6 caracteres; luego escribe el código de 6 dígitos que recibirás para verificar tu correo. Al completar la verificación, tu sesión se iniciará automáticamente.";
  }

  if (/(donde|ver|consult|revis|mostrar|encuentro|mi reserva|mis reservas|reservas que hice)/.test(text) &&
      /(reserva|reservacion|estadias|estadía)/.test(text)) {
    return "Puedes consultar tus estadías desde «Mis reservas» en el menú, después de iniciar sesión. Si acabas de enviar una reserva, también puedes pulsar «Ver mis reservas» en la confirmación. Usa la cuenta y el correo con los que reservaste.";
  }

  if (/(precio|precios|cuesta|costo|tarifa|valor)/.test(text)) {
    return "Estas son nuestras tarifas por noche: Habitación Simple S/ 180, Habitación Doble S/ 260, Deluxe Premium S/ 340 y Suite Suiza S/ 490. El total depende del número de noches.";
  }

  const room = rooms.find(item => item.terms.some(term => text.includes(term)));
  if (room && /(habitacion|cuarto|cuesta|precio|capacidad|personas|huespedes|camas|incluye)/.test(text)) {
    return `${room.name}: S/ ${room.price} por noche, capacidad para ${room.capacity}. Puedes consultar sus fotos y detalles en la sección Habitaciones.`;
  }

  if (/(habitacion|habitaciones|cuarto|cuartos|tipos de cuarto)/.test(text)) {
    return "Tenemos Habitación Simple (S/ 180/noche, 1–2 huéspedes), Habitación Doble (S/ 260/noche, 2–3), Deluxe Premium (S/ 340/noche, 2) y Suite Suiza (S/ 490/noche, 2–4).";
  }

  if (/(comodidad|comodidades|amenidad|amenidades|incluye|wifi|wi fi|aire acondicionado|minibar|mini bar)/.test(text)) {
    return "Las habitaciones incluyen Wi-Fi, aire acondicionado, TV por cable, ventilador de techo y secador de cabello. Algunas categorías también incluyen minibar. Escríbenos si quieres consultar una habitación específica.";
  }

  if (/(reservar|reserva|reservacion|reservación|disponibilidad|disponible|fechas)/.test(text)) {
    return "Para solicitar una reserva, completa el formulario «Reserva directa» con la habitación, las fechas, el número de huéspedes y tus datos. El equipo se pondrá en contacto contigo para confirmar los detalles. Puedes ir al formulario desde el botón Reservar ahora.";
  }

  if (/(cancelar|cancelacion|cancelación|reembolso|devolucion|devolución|politica|política)/.test(text)) {
    return "La información publicada en nuestras preguntas frecuentes indica que las reservas directas pueden cancelarse sin costo hasta 48 horas antes de la llegada. Si ya tienes una reserva, confirma las condiciones específicas con nuestro equipo.";
  }

  if (/(contacto|telefono|teléfono|llamar|correo|email|hablar|asesor|persona)/.test(text)) {
    return "Con gusto te atendemos por teléfono al +51 939 179 538.";
  }

  if (/(ubicacion|ubicación|direccion|dirección|llegar|mapa|check in|check-in|check out|check-out|hora de entrada|hora de salida)/.test(text)) {
    return "No tengo ese detalle disponible en este momento. El equipo puede ayudarte directamente: llama al +51 939 179 538.";
  }

  return "Puedo ayudarte con precios, habitaciones, comodidades, reservas y cancelaciones. Si tu consulta es más específica, llámanos al +51 939 179 538.";
}

function addSupportMessage(message, sender, actionLabel = "") {
  const bubble = document.createElement("div");
  bubble.className = `support-message ${sender}`;
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  bubble.appendChild(paragraph);
  if (actionLabel) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "support-chat-action";
    action.textContent = actionLabel;
    action.addEventListener("click", () => {
      setSupportChatOpen(false);
      openAuthModal("register");
    });
    bubble.appendChild(action);
  }
  supportChatMessages.appendChild(bubble);
  while (supportChatMessages.children.length > 41) {
    supportChatMessages.removeChild(supportChatMessages.children[1]);
    supportChatMessages.removeChild(supportChatMessages.children[1]);
  }
  supportChatMessages.scrollTop = supportChatMessages.scrollHeight;
}

function sendSupportQuestion(question) {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return;
  addSupportMessage(trimmedQuestion, "user");
  const isRegistrationQuestion = /(registr|crear cuenta|crear usuario|abrir cuenta|cuenta nueva)/.test(
    normalizeSupportQuestion(trimmedQuestion)
  );
  addSupportMessage(
    getSupportAnswer(trimmedQuestion),
    "bot",
    isRegistrationQuestion && !getCurrentUser() ? "Ir a crear cuenta" : ""
  );
}

supportChatLauncher.addEventListener("click", () =>
  setSupportChatOpen(supportChatPanel.hidden)
);
document.getElementById("supportChatClose").addEventListener("click", () => {
  setSupportChatOpen(false);
  supportChatLauncher.focus();
});
supportChatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendSupportQuestion(supportChatInput.value);
  supportChatForm.reset();
  supportChatInput.focus();
});
document.querySelectorAll("[data-chat-question]").forEach(button => {
  button.addEventListener("click", () => sendSupportQuestion(button.dataset.chatQuestion));
});

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
sincronizarReservasDesdeBackend(); 
sincronizarHabitacionesDesdeBackend(); 
sincronizarEmpleadosDesdeBackend(); 
updateNavAccount();
updateCarouselArrows();
refreshLocalDate();