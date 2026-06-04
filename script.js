    // Navegación (Single Page Application)
    function showSection(sectionId, element) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.sidebar a').forEach(link => link.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
        element.classList.add('active');
    }

    // VARIABLES GLOBALES PARA GRÁFICOS
    let chartInt = null;
    let chartEdo = null;

    // --- MÓDULO 1: Sistemas Lineales (Gauss-Seidel) ---
    function calcularSisLineal() {
        // Matriz A (condiciones de ruta, simplificadas)
        const A = [[5, -1, -1], [-1, 4, -1], [-1, -1, 6]];
        // Vector b (demandas)
        const b = [
            parseFloat(document.getElementById('demNorte').value),
            parseFloat(document.getElementById('demCentro').value),
            parseFloat(document.getElementById('demSur').value)
        ];
        
        let x = [0, 0, 0]; // Valores iniciales
        let iteraciones = 20;
        
        for(let k=0; k<iteraciones; k++){
            let x_new = [...x];
            x_new[0] = (b[0] - (A[0][1]*x[1] + A[0][2]*x[2])) / A[0][0];
            x_new[1] = (b[1] - (A[1][0]*x_new[0] + A[1][2]*x[2])) / A[1][1];
            x_new[2] = (b[2] - (A[2][0]*x_new[0] + A[2][1]*x_new[1])) / A[2][2];
            x = x_new;
        }

        document.getElementById('resSisLineal').innerHTML = `
            <strong>Solución (Envíos por Planta):</strong><br>
            Planta 1 a Zona Norte: ${x[0].toFixed(2)} unidades<br>
            Planta 2 a Zona Centro: ${x[1].toFixed(2)} unidades<br>
            Planta 3 a Zona Sur: ${x[2].toFixed(2)} unidades<br>
            <em>*El sistema es estable. Un cambio abrupto por bloqueo afectaría los coeficientes de la matriz, requiriendo re-calcular la ruta óptima.</em>
        `;
    }

    // --- MÓDULO 2: Raíces de Ecuaciones (Bisección) ---
    function calcularRaiz() {
        // Función: f(x) = 500 - 100*exp(0.1*x)  -> Dónde el consumo supera el ingreso
        const f = (x) => 500 - 100 * Math.exp(0.1 * x);
        let a = 0; // Día 0
        let b = 30; // Día 30
        let tol = 0.001;
        let iter = 0;
        let c = 0;

        if(f(a)*f(b) >= 0) {
            document.getElementById('resRaiz').innerHTML = "No hay raíz en el intervalo.";
            return;
        }

        while((b-a)/2 > tol && iter < 100) {
            c = (a+b)/2;
            if(f(c) === 0) break;
            else if(f(a)*f(c) < 0) b = c;
            else a = c;
            iter++;
        }

        document.getElementById('resRaiz').innerHTML = `
            <strong>Día de Umbral Crítico (Punto de quiebre):</strong> Día ${c.toFixed(2)} <br>
            <strong>Iteraciones (Bisección):</strong> ${iter} <br>
            <em>A partir del día ${Math.ceil(c)}, la demanda sobrepasa exponencialmente la capacidad de reposición, generando desabastecimiento.</em>
        `;
    }

    // --- MÓDULO 3: Interpolación (Lagrange) ---
    const diasDatos = [1, 5, 10, 15, 20, 30];
    const preciosDatos = [8, 10, 13, 16, 19, 22];

    function lagrange(xEval) {
        let resultado = 0;
        for(let i=0; i<diasDatos.length; i++) {
            let termino = preciosDatos[i];
            for(let j=0; j<diasDatos.length; j++) {
                if(i !== j) {
                    termino = termino * (xEval - diasDatos[j]) / (diasDatos[i] - diasDatos[j]);
                }
            }
            resultado += termino;
        }
        return resultado;
    }

    function calcularInterpolacion() {
        let diaEval = parseFloat(document.getElementById('diaInterp').value);
        let precioEst = lagrange(diaEval);
        
        document.getElementById('resInterp').innerHTML = `Precio estimado el día ${diaEval}: <strong>${precioEst.toFixed(2)} Bs</strong>`;

        // Generar gráfica
        let puntosX = [];
        let puntosY = [];
        for(let i=1; i<=30; i++) {
            puntosX.push(i);
            puntosY.push(lagrange(i));
        }

        if(chartInt) chartInt.destroy();
        const ctx = document.getElementById('chartInterpolacion').getContext('2d');
        chartInt = new Chart(ctx, {
            type: 'line',
            data: {
                labels: puntosX,
                datasets: [
                    { label: 'Curva de Precios (Lagrange)', data: puntosY, borderColor: 'orange', tension: 0.4, fill: false },
                    { label: 'Datos Reales', data: diasDatos.map((d,i) => ({x: d, y: preciosDatos[i]})), backgroundColor: 'red', type: 'scatter', radius: 5 }
                ]
            },
            options: { scales: { x: { title: {display: true, text: 'Día'} }, y: { title: {display: true, text: 'Precio (Bs)'} } } }
        });
    }

    // --- MÓDULO 4: Integración (Simpson 1/3) ---
    function calcularIntegracion() {
        let a = 1;
        let b = 30;
        let n = 28; // Número par de intervalos
        let h = (b-a)/n;
        let suma = lagrange(a) + lagrange(b);

        for(let i=1; i<n; i++) {
            let x = a + i*h;
            if(i%2 === 0) suma += 2 * lagrange(x);
            else suma += 4 * lagrange(x);
        }
        let integral = (h/3) * suma;

        document.getElementById('resInteg').innerHTML = `
            <strong>Gasto Total Mensual Estimado:</strong> ${integral.toFixed(2)} Bs.<br>
            <small>Calculado integrando la curva polinómica desde el día 1 al 30 mediante regla de Simpson 1/3.</small>
        `;
    }

    // --- MÓDULO 5: EDOs (Método de Euler y Heun/RK4 simplificado) ---
    function calcularEDO() {
        let R0 = parseFloat(document.getElementById('reservaInicial').value);
        let E = parseFloat(document.getElementById('ingresoDiario').value);
        
        // Consumo aumenta diariamente por pánico: C(t) = 1000 + 50*t
        const f = (t, R) => E - (1000 + 50 * t); 
        
        let t = 0;
        let R_euler = R0;
        let h = 1; // Paso de 1 día
        
        let datosT = [0];
        let datosR_euler = [R0];
        
        let diaAgotamiento = -1;

        for(let i=1; i<=30; i++) {
            // Método de Euler: y(i+1) = y(i) + h*f(t, y)
            R_euler = R_euler + h * f(t, R_euler);
            t = t + h;
            
            if(R_euler < 0 && diaAgotamiento === -1) diaAgotamiento = i;
            
            datosT.push(t);
            datosR_euler.push(R_euler < 0 ? 0 : R_euler);
        }

        document.getElementById('resEDO').innerHTML = diaAgotamiento !== -1 ? 
            `<strong>ALERTA:</strong> Reserva vaciada completamente en el día ${diaAgotamiento}.` : 
            `Las reservas aguantan los 30 días de simulación.`;

        if(chartEdo) chartEdo.destroy();
        const ctx = document.getElementById('chartEDO').getContext('2d');
        chartEdo = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datosT,
                datasets: [
                    { label: 'Nivel de Reserva (Euler)', data: datosR_euler, borderColor: 'red', backgroundColor: 'rgba(255,0,0,0.1)', fill: true, tension: 0.1 }
                ]
            },
            options: { scales: { x: { title: {display: true, text: 'Días'} }, y: { title: {display: true, text: 'Volumen de Reserva'} } } }
        });
    }

    // Ejecutar gráficos iniciales al cargar la página por primera vez de forma silente
    setTimeout(() => { calcularInterpolacion(); calcularEDO(); }, 500);

