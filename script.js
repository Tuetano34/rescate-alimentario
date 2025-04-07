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
            }

            reader.readAsDataURL(this.files[0]);
        }
    });

    getLocationBtn.addEventListener("click", getCurrentLocation);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const foto = fotoInput.files.length ? URL.createObjectURL(fotoInput.files[0]) : null;
        const nombre = document.getElementById("nombre").value.trim();
        const fecha = document.getElementById("fecha").value;
        const ubicacion = ubicacionInput.value.trim();
        const precio = document.getElementById("precio").value;
        const precioRebajado = document.getElementById("precio-rebajado").value;
        const categoria = document.getElementById("categoria").value;

        if (!nombre || !fecha || !ubicacion || !precio || !precioRebajado) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        const product = {
            foto: foto,
            nombre: nombre,
            fecha: fecha,
            ubicacion: ubicacion,
            precio: precio,
            precioRebajado: precioRebajado,
            categoria: categoria,
            reservado: false // Añadir campo para el estado de reserva
        };

        saveProduct(product);
        displayProducts();
        form.reset();
        previewContainer.innerHTML = "";
    });

    clearAllBtn.addEventListener("click", function () {
        localStorage.removeItem("products");
        displayProducts();
    });

    function saveProduct(product) {
        let products = JSON.parse(localStorage.getItem("products") || "[]");
        products.push(product);
        localStorage.setItem("products", JSON.stringify(products));
    }

    function displayProducts() {
        productsList.innerHTML = "";
        let products = JSON.parse(localStorage.getItem("products") || "[]");

        const categoryFilter = document.getElementById("category-filter").value;
        const searchInput = document.getElementById("search-input").value.toLowerCase();

        if (products.length === 0) {
            productsList.innerHTML = "<p>No hay productos reportados.</p>";
            return;
        }

        products.forEach((product, index) => {
            if ((categoryFilter === "" || product.categoria === categoryFilter) &&
                (searchInput === "" || product.nombre.toLowerCase().includes(searchInput))) {

                const productDiv = document.createElement("div");
                productDiv.classList.add("product-item");

                const icon = document.createElement("span");
                icon.classList.add("icon");
                icon.textContent = categoryIcons[product.categoria] || "📦";
                productDiv.appendChild(icon);

                if (product.foto) {
                    const img = document.createElement("img");
                    img.src = product.foto;
                    img.style.maxWidth = "100%";
                    img.style.maxHeight = "150px";
                    img.style.borderRadius = "5px";
                    productDiv.appendChild(img);
                }
    
                const productName = document.createElement("p");
                productName.textContent = product.nombre;
                productDiv.appendChild(productName);
    
                const productLocation = document.createElement("p");
                productLocation.classList.add("location");
                productLocation.textContent = "Ubicación: " + product.ubicacion;
                productDiv.appendChild(productLocation);
    
                // Botón para ver mapa
                const viewMapBtn = document.createElement("button");
                viewMapBtn.classList.add("view-map-btn");
                viewMapBtn.textContent = "Ver Mapa";
                viewMapBtn.addEventListener("click", function () {
                    openMap(product.ubicacion);
                });
                productDiv.appendChild(viewMapBtn);

                // Botón para reservar producto
                const reserveBtn = document.createElement("button");
                reserveBtn.classList.add("reserve-btn");
                
                // Cambiar el texto y estilo del botón según el estado de reserva
                if (product.reservado) {
                    reserveBtn.textContent = "Reservado";
                    reserveBtn.classList.add("reserved");
                } else {
                    reserveBtn.textContent = "Reservar";
                }
                
                reserveBtn.addEventListener("click", function() {
                    toggleReserve(index);
                });
                productDiv.appendChild(reserveBtn);

                // Botón para compartir por WhatsApp
                const shareBtn = document.createElement("button");
                shareBtn.classList.add("share-btn");
                shareBtn.textContent = "Compartir";
                shareBtn.addEventListener("click", function() {
                    shareProductWhatsApp(product);
                });
                productDiv.appendChild(shareBtn);

                // Botón para borrar producto
                const deleteBtn = document.createElement("button");
                deleteBtn.classList.add("delete-btn");
                deleteBtn.textContent = "Borrar";
                deleteBtn.addEventListener("click", function() {
                    deleteProduct(index);
                });
                productDiv.appendChild(deleteBtn);
    
                productsList.appendChild(productDiv);
            }
        });
    }

    function deleteProduct(index) {
        let products = JSON.parse(localStorage.getItem("products") || "[]");
        products.splice(index, 1);
        localStorage.setItem("products", JSON.stringify(products));
        displayProducts();
    }

    function toggleReserve(index) {
        let products = JSON.parse(localStorage.getItem("products") || "[]");
        products[index].reservado = !products[index].reservado;
        localStorage.setItem("products", JSON.stringify(products));
        displayProducts();
    }

    function shareProductWhatsApp(product) {
        const text = `¡Rescata alimentos! *${product.nombre}* disponible en ${product.ubicacion}. Precio rebajado: ${product.precioRebajado}€ (antes ${product.precio}€). Fecha caducidad: ${product.fecha}. Vía app Rescate Alimentario.`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }

    function openMap(location) {
        const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(location)}`;
        window.open(mapUrl, "_blank");
    }

    displayProducts();

    document.getElementById("category-filter").addEventListener("change", displayProducts);
    document.getElementById("search-input").addEventListener("input", displayProducts);
});
