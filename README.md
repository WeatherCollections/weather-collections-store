# Weather Collections Store

Mobile-first bilingual (English/Urdu) storefront and starter admin panel built with React, Vite and Supabase.

## Local setup
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run `npm run dev`.

## Supabase
This frontend expects the Weather Collections database schema already installed:
- `products`, `product_variants`, `orders`, `order_status_history`
- `admin_users`, `promotions`, `coupons`, `calendar_events`, `store_settings`
- RPC `place_wc_order`
- Storage bucket `product-images`

Use the Supabase Project URL and publishable/anon key only. NEVER put a `service_role` or secret key in frontend code or GitHub.

## Important launch checklist
- Confirm your admin user is present in `public.admin_users`.
- Enter real stock counts for every size before accepting orders.
- Upload the correct product photos and verify their colour/design mapping.
- Configure Supabase Auth redirect URLs for the deployed website.
- Test a complete COD and advance-payment order before launch.
- This starter currently shows a 50% catalogue offer; verify campaign/discount rules before accepting real payments.
