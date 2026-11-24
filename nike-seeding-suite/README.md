# Nike Seeding Suite

Inventory, talent lookbooks and back-of-house fulfillment for a Nike seeding suite.
Static web app + two Vercel serverless functions + Supabase (database, realtime sync, image storage, staff login).

- `#guest`: shared iPads. A guest taps their name, browses inventory, builds a lookbook, sends it to stylists, then picks Keep or Return for each item after trying it on.
- `#back-of-house`: the pull queue per guest (with rack #), a combined pick list, fitting and completed guests.
- `#admin`: event settings, default allocations, staff PIN, Excel import and templates, product images, report export.
- EN / ES toggle in the header.

## Files

```
index.html            the whole app (UI + logic)
api/config.js         gives the browser the public Supabase URL + key
api/nike-image.js     server-side lookup of a Nike product image by SKU
supabase/schema.sql   tables, security rules, realtime, image bucket
```

## Deploy (about 15 minutes)

### 1. GitHub
1. Create a new **private** repo, e.g. `nike-seeding-suite`.
2. Upload every file in this folder: **Add file → Upload files**, drag the folder contents, then **Commit**. You can also use `git push` if you prefer.

### 2. Supabase
1. Create a new project at supabase.com.
2. **SQL Editor → New query**: paste all of `supabase/schema.sql`, then click **Run**.
3. **Authentication → Users → Add user → Create new user**: create the staff login the iPads will use, e.g. `suite@optimistinc.mx` with a strong password. Tick **Auto confirm user**.
4. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.

### 3. Vercel
1. **Add New → Project**, then import the GitHub repo.
2. Framework preset: **Other**. Leave the build settings empty.
3. **Environment Variables**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = anon / publishable key

   Connecting Vercel's Supabase integration instead also works; the app reads its variable names too.
4. **Deploy**. Optional: add a custom domain such as `seeding.optimistinc.mx` under **Settings → Domains**.

### 4. Event setup
1. Open the site and sign in with the staff account. Each iPad stays signed in.
2. **Admin**: set the event name, default allocations and a staff PIN.
3. Download the templates, fill them in, then import the inventory and guest list. After an inventory import, the app automatically tries to fetch a Nike image for each new SKU.
4. Fix any missing images: drop files named by SKU (e.g. `DD1391-100.jpg`), or open a product and paste an image copied from nike.com.
5. Guest iPads: open `/#guest`. Back of house: open `/#back-of-house` (the PIN is asked for once per browser session).

## Excel formats
- **Inventory**: `SKU | Product Name | Category | Color | Size | Quantity`, with one row per SKU + size. Categories: Footwear, Tops, Bottoms, Jackets, Hoodies, Accessories (Spanish names also work).
- **Guests**: `Name | Role / Team | Top Size | Bottom Size | Shoe Size | Footwear | Tops | Bottoms | Jackets | Hoodies | Accessories | Notes`. A blank allocation uses the event default.

## Notes
- Stock is reserved as soon as an item enters a lookbook. Returned items go back to stock and free up the guest's allocation.
- Nike image lookup uses public Nike pages and image servers. Nike can change or block these, so the manual drop / paste always works as a backup.
- Free Supabase projects pause after a week with no activity. Open the app a day before the event, or use a paid plan.
- Opening `index.html` without a backend runs a local demo whose data stays in that browser tab only.
