document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const fotoInput = document.getElementById("foto");
    const ubicacionInput = document.getElementById("ubicacion");
    const getLocationBtn = document.getElementById("get-location-btn");
    const previewContainer = document.createElement("div");
    previewContainer.id = "preview";
    previewContainer.style.marginTop = "10px";
    form.insertBefore(previewContainer, form.querySelector(".report-btn"));
    const productsList = document.getElementById("products-list");
    const clearAllBtn = document.getElementById("clear-all-btn");

    const categoryIcons = {
        frutas: "🍎",
        lacteos: "🥛",
        carne: "🍖",
        panaderia: "🥐",
        platos: "🍲"
    };

    function getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                        const data = await response.json();
                        if (data && data.display_name) {
                            ubicacionInput.value = data.display_name;
                        } else {
                            ubicacionInput.value = `Lat: ${lat}, Lon: ${lng}`;
                            console.warn("No se pudo obtener una dirección legible.");
                        }
                    } catch (error) {
                        console.error("Error al obtener la dirección:", error);
                        ubicacionInput.value = `Lat: ${lat}, Lon: ${lng}`;
                    }
                },
                (error) => {
                    console.error("Error al obtener la ubicación:", error);
                    ubicacionInput.value = "";
                    ubicacionInput.placeholder = "Ingresa la ubicación manualmente";
                }
            );
        } else {
            console.error("El navegador no soporta geolocalización.");
            ubicacionInput.value = "";
            ubicacionInput.placeholder = "Tu navegador no soporta geolocalización";
        }
    }

    getCurrentLocation();

    fotoInput.addEventListener("change", function () {
        previewContainer.innerHTML = "";
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.style.maxWidth = "200px";
                img.style.borderRadius = "5px";
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    getLocationBtn.addEventListener("click", getCurrentLocation);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const foto = fotoInput.files.length;
        const nombre = document.getElementById("nombre").value.trim();
        const fecha = document.getElementById("fecha").value;
        const ubicacion = ubicacionInput.value.trim();
        const precio = document.getElementById("precio").value;
        const precioRebajado = document.getElementById("precio_rebajado").value;
        const categoria = document.getElementById("categoria").value;

        if (!foto) {
            alert("Por favor, sube una foto del producto.");
            return;
        }
        if (nombre === "") {
            alert("El nombre del producto es obligatorio.");
            return;
        }
        if (fecha === "") {
            alert("Por favor, selecciona una fecha válida.");
            return;
        }
        if (new Date(fecha) < new Date()) {
            alert("La fecha no puede ser anterior a hoy.");
            return;
        }
        if (ubicacion === "") {
            alert("La ubicación del producto es obligatoria.");
            return;
        }
        if (precio && precioRebajado && parseFloat(precioRebajado) > parseFloat(precio)) {
            alert("El precio rebajado no puede ser mayor al precio original.");
            return;
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ubicacion)}&format=json&limit=1`);
            const data = await response.json();

            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                const direccion = data[0].display_name || ubicacion;

                const productItem = document.createElement("div");
                productItem.className = "product-item";
                const icon = categoryIcons[categoria] || "🛒";
                productItem.innerHTML = `
                    <div class="icon">${icon}</div>
                    <p>${nombre}</p>
                    <p class="location">📍 ${direccion}</p>
                    <button class="view-map-btn" data-lat="${lat}" data-lng="${lng}">Ver en mapa</button>
                    <button class="delete-btn">🗑️ Borrar</button>
                `;
                productsList.appendChild(productItem);

                productItem.querySelector(".view-map-btn").addEventListener("click", function () {
                    showMap(lat, lng, nombre, direccion);
                });

                productItem.querySelector(".delete-btn").addEventListener("click", function () {
                    if (confirm(`¿Estás seguro de que quieres borrar "${nombre}"?`)) {
                        productItem.remove();
                    }
                });

                alert(`¡Producto "${nombre}" reportado con éxito en ${direccion}!`);
                form.reset();
                previewContainer.innerHTML = "";
                getCurrentLocation();
            } else {
                alert("No se pudo encontrar la ubicación exacta. Usando el texto ingresado.");
                const productItem = document.createElement("div");
                productItem.className = "product-item";
                const icon = categoryIcons[categoria] || "🛒";
                productItem.innerHTML = `
                    <div class="icon">${icon}</div>
                    <p>${nombre}</p>
                    <p class="location">📍 ${ubicacion}</p>
                    <button class="delete-btn">🗑️ Borrar</button>
                `;
                productsList.appendChild(productItem);

                productItem.querySelector(".delete-btn").addEventListener("click", function () {
                    if (confirm(`¿Estás seguro de que quieres borrar "${nombre}"?`)) {
                        productItem.remove();
                    }
                });

                alert(`¡Producto "${nombre}" reportado con éxito en ${ubicacion}!`);
                form.reset();
                previewContainer.innerHTML = "";
                getCurrentLocation();
            }
        } catch (error) {
            console.error("Error al buscar la ubicación:", error);
            alert("Error al buscar la ubicación. Usando el texto ingresado.");
            const productItem = document.createElement("div");
            productItem.className = "product-item";
            const icon = categoryIcons[categoria] || "🛒";
            productItem.innerHTML = `
                <div class="icon">${icon}</div>
                <p>${nombre}</p>
                <p class="location">📍 ${ubicacion}</p>
                <button class="delete-btn">🗑️ Borrar</button>
            `;
            productsList.appendChild(productItem);

            productItem.querySelector(".delete-btn").addEventListener("click", function () {
                if (confirm(`¿Estás seguro de que quieres borrar "${nombre}"?`)) {
                    productItem.remove();
                }
            });

            alert(`¡Producto "${nombre}" reportado con éxito en ${ubicacion}!`);
            form.reset();
            previewContainer.innerHTML = "";
            getCurrentLocation();
        }
    });

    clearAllBtn.addEventListener("click", function () {
        if (productsList.children.length === 0) {
            alert("No hay productos para borrar.");
            return;
        }
        if (confirm("¿Estás seguro de que quieres borrar todos los productos reportados?")) {
            productsList.innerHTML = "";
            alert("Todos los productos han sido borrados.");
        }
    });

    function showMap(lat, lng, nombre, direccion) {
        const mapModal = document.createElement("div");
        mapModal.style.position = "fixed";
        mapModal.style.top = "0";
        mapModal.style.left = "0";
        mapModal.style.width = "100%";
        mapModal.style.height = "100%";
        mapModal.style.background = "rgba(0,0,0,0.5)";
        mapModal.style.display = "flex";
        mapModal.style.justifyContent = "center";
        mapModal.style.alignItems = "center";
        mapModal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 10px; width: 80%; max-width: 600px;">
                <h3>${nombre}</h3>
                <p>${direccion}</p>
                <div id="map" style="height: 300px; width: 100%;"></div>
                <button style="margin-top: 10px;" onclick="this.parentElement.parentElement.remove()">Cerrar</button>
            </div>
        `;
        document.body.appendChild(mapModal);

        const map = L.map("map").setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        L.marker([lat, lng]).addTo(map)
            .bindPopup(nombre)
            .openPopup();
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration);
                })
                .catch(error => {
                    console.log('Error al registrar el Service Worker:', error);
                });
        });
    }
});
