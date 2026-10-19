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
- **Código para entrenar:** el asesorado ve sus rutinas solo con un código de 6 números. Equipo → el asesorado → **Entrenar hoy → Dar código → Enviar** (WhatsApp). El código sirve 24 h para ingresarlo; ya ingresado, la rutina queda abierta 4 h o hasta que envíe la sesión, y ahí se vuelve a bloquear. 5 intentos fallidos lo anulan. El bloqueo lo hace la base de datos: sin código no viajan los ejercicios al teléfono.
- **Pagos:** Ajustes → **Pagos**: la fecha de vencimiento de cada uno. Tres días antes aparece en tu inicio (con botón de recordatorio por WhatsApp) y al asesorado le sale el aviso. **Pagó** corre la fecha un mes. Pon el WhatsApp en su ficha para que el mensaje le llegue directo.
- **Protección:** en la rutina del asesorado hay marca de agua con su nombre y la fecha, no se puede copiar el texto y la pantalla se oculta al salir de la app. Un navegador no puede impedir una captura de pantalla en iPhone o Android: la marca de agua hace que cualquier captura diga de quién salió.
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
