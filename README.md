# BELLIDO TRAINER · app de coach y asesorados

App web para armar programas de entrenamiento, que cada asesorado entrene con su propio enlace y ver el progreso de todos. Funciona en línea con **Supabase** (base de datos) y se publica en **Vercel**.

- **Coach:** equipo de asesorados → cada uno con **Rutinas** (programas de 2, 3, 5… días) y **Métricas**. Copiar y pegar ejercicios entre asesorados, plantillas, registrar entrenos en persona, importar respaldos de las versiones anteriores, de Hevy y sesiones sueltas.
- **Asesorado:** entra con su enlace personal (sin contraseña), elige cada semana el programa según los días que puede entrenar, registra series, peso, reps y RPE con cronómetro de descanso, y ve sus métricas. Si no hay señal, la sesión se guarda en el teléfono y se envía sola después.

---

## Puesta en marcha (una sola vez)

### 1. Supabase: la base de datos
1. Entra a [supabase.com](https://supabase.com) → **New project**. Ponle nombre (por ejemplo `bellidotrainer`) y una contraseña de base de datos (guárdala).
2. Cuando termine de crearse: **SQL Editor → New query**. Abre en GitHub el archivo [`supabase/schema.sql`](supabase/schema.sql), toca **Raw**, copia todo, pégalo y pulsa **Run**. Debe decir *Success*.
3. **Authentication → Sign In / Providers → Email**: apaga **Confirm email** (así entras sin esperar un correo).
4. **Project Settings → API**: copia la **Project URL** y la clave **anon public**. Las usas en el paso 2.

> **Cuando una actualización cambie la base de datos** (te lo avisan en el cambio): vuelve a correr el `schema.sql` completo igual que aquí. Se puede correr las veces que quieras sin perder datos.

### 2. Vercel: la publicación
1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New → Project** → importa este repositorio.
2. Vercel detecta que es Vite. Antes de **Deploy**, abre **Environment Variables** y agrega:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clave anon public
3. **Deploy**. En un minuto tienes tu dirección, algo como `https://bellidotrainer.vercel.app`.

> Si el nombre del proyecto da problema por el punto final del repositorio, cámbialo a `bellidotrainer` en la pantalla de importación.

### 3. Tu cuenta de coach
1. Abre tu dirección de Vercel → **Primera vez: crear cuenta de coach** → correo y contraseña.
2. Vuelve a Supabase → **Authentication → Sign In / Providers** y apaga **Allow new users to sign up**. Así nadie más puede crear cuentas.

### 4. Traer lo que ya tenías
1. En la app anterior: **Equipo → Descargar respaldo**.
2. En la nueva: **Ajustes (engranaje) → Importar archivo** → elige ese respaldo. Entran tus asesorados, su rutina (como “Rutina anterior”) y todo su historial. Importar dos veces el mismo archivo no duplica nada.

También importa las sesiones sueltas `.json` que te mandaban los asesorados y el `.csv` de Hevy.

### 5. Mandar el acceso a cada asesorado
Equipo → el asesorado → **Acceso → WhatsApp**. Ese enlace es fijo: con él ve sus rutinas y métricas, y te llega cada entreno al terminarlo. Si alguna vez quieres cortarle el acceso: **… → Cambiar su enlace** o **Archivar**.

---

## Para el día a día
- **Biblioteca de ejercicios:** Equipo → **Biblioteca**. La primera vez toca **Crear biblioteca**: junta los ejercicios de todas las rutinas, del historial y de las plantillas, y deja uno solo por ejercicio aunque esté escrito distinto (“Extensión de cuádriceps”, “extensiones cuadriceps”, “extension cuadriceps maquina”). Los videos que tenía un asesorado pasan a los demás que tenían ese ejercicio sin video. El nombre que tenía cada asesorado y su historial no cambian. Si dos ejercicios parecen el mismo, la app te los muestra para **unirlos** o marcarlos como distintos. Cambiar el video de un ejercicio lo pasa a las rutinas que no tenían o tenían el anterior.
- **Plantillas:** Equipo → **Plantillas**. **Crear plantillas** hace una de cada rutina distinta de tu equipo (si varios tienen la misma, queda una). **Nueva plantilla** → **Agregar de la biblioteca** (eliges en orden) → **Asignar a asesorados** crea el programa en cada uno. Al crear un programa, en **Plantilla** salen primero las tuyas.
- **Ortografía:** si algún nombre de rutina, día o ejercicio está mal escrito (en español o inglés: “Hip trust”, “Extencion de cuadriceps”, “Dia 1”…), Biblioteca y Plantillas te avisan y **Corregir todo** lo arregla. El historial queda igual y el progreso se sigue viendo junto con el nombre nuevo. Al escribir un ejercicio la app sugiere la forma correcta.
- **Preparar la sesión:** en el asesorado, **Dar código** abre *Preparar sesión*: por cada ejercicio ves su última sesión, mayor peso, mayor volumen y 1RM estimado, ajustas series, reps, descanso, RPE y carga, y despliegas la **escala de intensidad (1–100 % del 1RM)** para poner la carga con un toque. **Guardar y dar código** deja todo listo y crea el código.
- **Composición corporal:** en el asesorado → **Subir informe PDF** (el informe antropométrico de BELLIDOTRAINER). La app lee peso, % de grasa, masa grasa, masa libre de grasa, músculo esquelético, % de masa muscular, IMC y cintura; revisas, completas grasa visceral o edad metabólica si las tienes, y guardas. El asesorado lo ve en su inicio con los cambios. El PDF se lee en tu teléfono y no se sube a ningún lado.
- **Código para entrenar:** el asesorado ve sus rutinas solo con un código de 6 números. Equipo → el asesorado → **Entrenar hoy → Dar código → Enviar** (WhatsApp). El código sirve 24 h para ingresarlo; ya ingresado, la rutina queda abierta 4 h o hasta que envíe la sesión, y ahí se vuelve a bloquear. 5 intentos fallidos lo anulan. El bloqueo lo hace la base de datos: sin código no viajan los ejercicios al teléfono.
- **Pagos:** Ajustes → **Pagos**: la fecha de vencimiento de cada uno. Tres días antes aparece en tu inicio (con botón de recordatorio por WhatsApp) y al asesorado le sale el aviso. **Pagó** corre la fecha un mes. Pon el WhatsApp en su ficha para que el mensaje le llegue directo.
- **Entrenamiento del asesorado:** el video de YouTube se ve de una vez en formato vertical (shorts 9:16) y entra en pantalla completa sin quedar negro; hay conversor **kg⇄lb**; al terminar el botón dice **Enviar a Coach** y el resumen compara los kilos movidos con algo real (“como levantar 2 elefantes africanos”).
- **Protección:** en la rutina del asesorado no se puede copiar el texto y la pantalla se oculta al salir de la app. Un navegador no puede impedir una captura de pantalla en iPhone o Android.
- **Programas por frecuencia:** Rutinas → Nuevo programa → elige 2, 3, 4, 5 o 6 días (en blanco, desde plantilla o copiando otro programa).
- **Copiar y pegar ejercicios:** en un día, **Seleccionar** → marca ejercicios → **Copiar**; ve al asesorado y día que quieras → **Pegar aquí**. O usa **Traer de otro asesorado** y elige día completo o ejercicios sueltos. Solo viajan los ejercicios, nunca el historial.
- **Carga sugerida y nota:** en cada ejercicio. El asesorado las ve resaltadas y la tabla arranca con esa carga.
- **Ocultar un programa** mientras lo armas: engranaje del programa → *Visible para…*

## Para desarrollar
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # genera dist/
node test/schema.test.mjs   # seguridad de la base (Postgres en memoria)
node test/store.test.mjs    # datos en línea + importación de respaldos
```
Sin las variables de Supabase la app arranca en **modo local** (todo en el teléfono), útil para probar.
