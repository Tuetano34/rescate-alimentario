document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("report-form");
    const fotoInput = document.getElementById("foto");
    const takePhotoBtn = document.getElementById("take-photo-btn");
    const ubicacionInput = document.getElementById("ubicacion");
    const getLocationBtn = document.getElementById("get-location-btn");
    const preview = document.getElementById("preview");
    const productsList = document.getElementById("products-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const searchInput = document.getElementById("search");
    const categoryFilter = document.getElementById("category-filter");
    const totalWeight = document.getElementById("total-weight");
    const userPoints = document.getElementById("user-points");

    const categoryIcons = {
        frutas: "fa-apple-alt",
        lacteos: "fa-cheese",
        carne: "fa-drumstick-bite",
        panaderia: "fa-bread-slice",
        platos: "fa-utensils"
    };

    let points = parseInt(localStorage.getItem("userPoints")) || 0;
    userPoints.textContent = points;

    // PWA Service Worker Registration
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
            .then(() => console.log("Service Worker registrado"))
            .catch(err => console.error("Error al registrar SW:", err));
    }

    // Notificaciones Push
    function showNotification(message) {
        if (Notification.permission === "granted") {
            new Notification(message);
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") new Notification(message);
            });
        }
        const alert = document.createElement("div");
        alert.className = "notification";
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    // Geolocation
    function getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async position => {
                    const { latitude: lat, longitude: lng } = position.coords;
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                        const data = await res.json();
                        ubicacionInput.value = data.display_name || `${lat}, ${lng}`;
                    } catch {
                        ubicacionInput.value = `${lat}, ${lng}`;
                    }
                },
                () => {
                    ubicacionInput.placeholder = "Ingresa manualmente";
                }
            );
        }
    }
    getCurrentLocation();
    getLocationBtn.addEventListener("click", getCurrentLocation);

    // Camera Capture
    takePhotoBtn.addEventListener("click", () => {
        fotoInput.click();
    });

    fotoInput.addEventListener("change", () => {
        preview.innerHTML = "";
        if (fotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement("img");
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(fotoInput.files[0]);
        }
    });

    // Load Products from localStorage
    function loadProducts() {
        const products = JSON.parse(localStorage.getItem("products") || "[]");
        products.forEach(addProductToList);
        updateStats(products.length);
        checkSharedProduct(products);
    }
    loadProducts();

    // Check for Shared Product in URL
    function checkSharedProduct(existingProducts) {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedId = urlParams.get("id");
        if (sharedId) {
            const sharedProduct = existingProducts.find(p => p.id == sharedId);
            if (sharedProduct) {
                const existingItem = productsList.querySelector(`[data-id="${sharedId}"]`);
                if (existingItem) existingItem.scrollIntoView({ behavior: "smooth" });
            } else {
                const product = {
                    id: parseInt(sharedId),
                    nombre: urlParams.get("nombre") || "Producto compartido",
                    ubicacion: urlParams.get("ubicacion") || "Ubicación desconocida",
                    categoria: urlParams.get("categoria") || "frutas",
                    foto: "https://via.placeholder.com/150",
                    fecha: urlParams.get("fecha") || new Date().toISOString().split("T")[0],
                    precio: urlParams.get("precio") || "",
                    precioRebajado: urlParams.get("precio_rebajado") || "",
                    reserved: false,
                    reserveTime: null
                };
                addProductToList(product);
                const products = JSON.parse(localStorage.getItem("products") || "[]");
                products.push(product);
                localStorage.setItem("products", JSON.stringify(products));
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Form Submission
    form.addEventListener("submit", async e => {
        e.preventDefault();
        const formData = new FormData(form);
        const product = {
            id: Date.now(),
            foto: await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(formData.get("foto"));
            }),
            nombre: formData.get("nombre").trim(),
            fecha: formData.get("fecha"),
            ubicacion: formData.get("ubicacion").trim(),
            precio: formData.get("precio"),
            precioRebajado: formData.get("precio_rebajado"),
            categoria: formData.get("categoria"),
            reserved: false,
            reserveTime: null
        };

        // Validation
        if (!product.foto) return alert("Toma una foto del producto");
        if (!product.nombre) return alert("Nombre requerido");
        if (new Date(product.fecha) < new Date()) return alert("Fecha inválida");
        if (!product.ubicacion) return alert("Ubicación requerida");

        const products = JSON.parse(localStorage.getItem("products") || "[]");
        products.push(product);
        localStorage.setItem("products", JSON.stringify(products));
        addProductToList(product);
        showNotification(`¡${product.nombre} reportado cerca de ti!`);
        points += 10;
        localStorage.setItem("userPoints", points);
        userPoints.textContent = points;
        updateStats(products.length);
        form.reset();
        preview.innerHTML = "";
        getCurrentLocation();
    });

    // Add Product to List
    function addProductToList(product) {
        const item = document.createElement("div");
        item.className = "product-item";
        item.dataset.id = product.id;
        item.innerHTML = `
            <i class="fas ${categoryIcons[product.categoria]} icon"></i>
            <img src="${product.foto}" alt="${product.nombre}">
            <p>${product.nombre}</p>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${product.ubicacion}</p>
            <button class="view-map-btn">Ver Mapa</button>
            <button class="reserve-btn" ${product.reserved ? "disabled" : ""}>Reservar</button>
            <span class="timer"></span>
            <button class="share-btn">Compartir</button>
            <button class="delete-btn"><i class="fas fa-trash"></i></button>
        `;
        productsList.appendChild(item);

        item.querySelector(".view-map-btn").addEventListener("click", async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(product.ubicacion)}&format=json&limit=1`);
                const data = await res.json();
                if (data[0]) {
                    showMap(data[0].lat, data[0].lon, product.nombre, product.ubicacion);
                } else {
                    alert("No se pudo encontrar la ubicación en el mapa.");
                }
            } catch (error) {
                console.error("Error al buscar ubicación:", error);
                alert("Error al cargar el mapa. Intenta de nuevo.");
            }
        });

        const reserveBtn = item.querySelector(".reserve-btn");
        if (product.reserved && product.reserveTime) startTimer(item, product.reserveTime);
        reserveBtn.addEventListener("click", () => {
            product.reserved = true;
            product.reserveTime = Date.now() + 30 * 60 * 1000;
            localStorage.setItem("products", JSON.stringify(productsListToArray()));
            reserveBtn.disabled = true;
            startTimer(item, product.reserveTime);
            points += 5;
            localStorage.setItem("userPoints", points);
            userPoints.textContent = points;
        });

        item.querySelector(".share-btn").addEventListener("click", () => {
            // Usar la URL base de tu proyecto en GitHub Pages
            const baseUrl = "https://tuetano34.github.io/rescate-alimentario";
            const shareUrl = `${baseUrl}?id=${product.id}&nombre=${encodeURIComponent(product.nombre)}&ubicacion=${encodeURIComponent(product.ubicacion)}&categoria=${product.categoria}&fecha=${product.fecha}&precio=${product.precio || ''}&precio_rebajado=${product.precioRebajado || ''}`;
            const text = `${product.nombre} disponible en ${product.ubicacion}. ¡Resérvalo ahora!`;
            
            // Mostrar el enlace generado para depuración
            console.log("Enlace generado para compartir:", shareUrl);
            
            if (navigator.share) {
                navigator.share({
                    title: "Rescate Alimentario",
                    text: text,
                    url: shareUrl
                })
                .then(() => console.log("Compartido exitosamente"))
                .catch(err => {
                    console.error("Error al compartir:", err);
                    fallbackShare(shareUrl);
                });
            } else {
                console.log("navigator.share no soportado");
                fallbackShare(shareUrl);
            }
        });

        item.querySelector(".delete-btn").addEventListener("click", () => {
            if (confirm(`¿Borrar ${product.nombre}?`)) {
                item.remove();
                localStorage.setItem("products", JSON.stringify(productsListToArray()));
                updateStats(productsList.children.length);
            }
        });
    }

    // Fallback para compartir si navigator.share no está disponible
    function fallbackShare(url) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    alert("Enlace copiado al portapapeles: " + url);
                })
                .catch(err => {
                    console.error("Error al copiar al portapapeles:", err);
                    alert("Por favor, copia este enlace manualmente: " + url);
                });
        } else {
            alert("Por favor, copia este enlace manualmente: " + url);
        }
    }

    // Timer
    function startTimer(item, endTime) {
        const timer = item.querySelector(".timer");
        const update = () => {
            const timeLeft = endTime - Date.now();
            if (timeLeft <= 0) {
                timer.textContent = "Reserva expirada";
                item.querySelector(".reserve-btn").disabled = false;
                const products = productsListToArray();
                const product = products.find(p => p.id == item.dataset.id);
                if (product) {
                    product.reserved = false;
                    product.reserveTime = null;
                    localStorage.setItem("products", JSON.stringify(products));
                }
            } else {
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                timer.textContent = `Tiempo restante: ${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
                setTimeout(update, 1000);
            }
        };
        update();
    }

    function productsListToArray() {
        return Array.from(productsList.children).map(item => {
            const product = JSON.parse(localStorage.getItem("products")).find(p => p.id == item.dataset.id);
            return { ...product, reserved: item.querySelector(".reserve-btn").disabled, reserveTime: product.reserveTime };
        });
    }

    // Filter Products
    function filterProducts() {
        const search = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        Array.from(productsList.children).forEach(item => {
            const name = item.querySelector("p").textContent.toLowerCase();
            const cat = Object.keys(categoryIcons).find(key => item.querySelector(".icon").classList.contains(categoryIcons[key]));
            item.style.display = (name.includes(search) && (!category || cat === category)) ? "block" : "none";
        });
    }
    searchInput.addEventListener("input", filterProducts);
    categoryFilter.addEventListener("change", filterProducts);

    // Clear All
    clearAllBtn.addEventListener("click", () => {
        if (productsList.children.length && confirm("¿Borrar todo?")) {
            productsList.innerHTML = "";
            localStorage.setItem("products", "[]");
            updateStats(0);
        }
    });

    // Map
    function showMap(lat, lng, nombre, ubicacion) {
        const mapId = `map-${Date.now()}`;
        const modal = document.createElement("div");
        modal.className = "map-modal";
        modal.innerHTML = `
            <div class="map-content">
                <h3>${nombre}</h3>
                <p>${ubicacion}</p>
                <div id="${mapId}" style="height: 300px;"></div>
                <button>Cerrar</button>
            </div>
        `;
        document.body.appendChild(modal);

        setTimeout(() => {
            const map = L.map(mapId).setView([lat, lng], 15);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap"
            }).addTo(map);
            L.marker([lat, lng]).addTo(map).bindPopup(nombre).openPopup();
        }, 0);

        modal.querySelector("button").addEventListener("click", () => modal.remove());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // Stats
    function updateStats(count) {
        totalWeight.textContent = count * 0.5;
    }
});

// Notification Styling
const style = document.createElement("style");
style.textContent = `
    .notification {
        position: fixed;
        top: 10px;
        right: 10px;
        background: #28a745;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 1000;
    }
    .map-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .map-content {
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 90%;
    }
`;
document.head.appendChild(style);
