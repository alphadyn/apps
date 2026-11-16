# People

People is a professional community with public profiles, searchable skills and experience, resume/CV links, a project gallery, and private one-to-one messages. Email and SMS links open the visitor's own email or messaging application; People does not send email or texts itself.

## Set up the live platform

1. Create a Supabase project. In its SQL editor, run [supabase-schema.sql](supabase-schema.sql), then [communities-schema.sql](communities-schema.sql). Both create namespaced tables and row-level security policies without deleting existing records. Existing People deployments should run the communities script to add this feature.
2. In [config.js](config.js), set `url` to the project URL and `anonKey` to the **publishable or anon** key from the project's API settings. These are public client credentials. **Never use a service-role or secret key in this file.**
3. Configure Supabase Auth's site URL and redirect URLs for your deployment. Email sign-up uses real email addresses and respects the project's email confirmation setting. For production, configure an appropriate SMTP provider and authentication/rate-limit settings in Supabase.
4. Serve the repository, for example `python3 -m http.server 8000`, and open <http://localhost:8000/people/>. The app can also be hosted as static files. If moving from the old URL, update Supabase Auth's site and redirect URLs for the new location.

Existing deployments using `kinship_*` tables must run [rename-kinship-to-people.sql](rename-kinship-to-people.sql) before deploying this version. The migration renames tables and associated objects in place, preserving data and access policies. Back up the database first and coordinate the migration with deployment: older app versions cannot use the renamed tables. It stops if both old and new table names already exist.

Without configuration, the app clearly labels its sample profiles and communities as preview data; accounts, community actions, and messages will not work. The Supabase JavaScript client and fonts are loaded from CDNs, so an internet connection is required. Images are externally hosted URLs and may reveal visitors' IP addresses to their hosts.

The public app URL includes static Open Graph and Twitter metadata and a 1200 × 630 PNG for link previews in messaging apps that support them. Preview appearance and caching depend on the receiving app; SMS itself does not guarantee a preview. The image is generated with `python3 people/generate_social_preview.py` (requires Pillow). The metadata points to the GitHub Pages deployment; change the canonical, Open Graph, and Twitter URLs if deploying elsewhere. The preview represents People as a whole, not individual profiles.

## How it works

- Anyone can browse and search public profiles. Signed-in users can create and edit their own profile, including experience, education, skills, a public CV URL and optional public email and phone. Only enter contact details you intend to publish.
- Gallery entries use public HTTP(S) image URLs. Members can add and remove their own entries; files are not uploaded to People.
- Communities, their member lists, and posts are public. Signed-in users with profiles can create, join, and leave communities; creators are joined automatically. An optional community image is a public HTTP(S) URL. Members can post and authors can remove their own posts, including after leaving. There are no private groups, replies, community management, or moderation controls. Community views refresh on navigation and after actions, not in real time.
- Signed-in members with profiles can send in-app messages to other members. Database policies restrict message reads to the sender and recipient and restrict sending to the authenticated sender. The inbox loads the latest 1,000 messages across the account and refreshes when opened or after sending; it is not realtime. Messages are stored in Supabase, not end-to-end encrypted.
- Profile search currently loads public profiles into the browser and filters locally. Community lists, members, and posts are also loaded into the browser in pages. This is suitable for small communities; large deployments need server-side search, incremental display, abuse prevention, moderation, retention controls, and a production privacy policy.
- Select the People brand to return to the app entry page.

The database policies enforce ownership and message privacy, but a production deployment still requires operational security, moderation, backups, and monitoring. This app does not provide account deletion, blocking, message deletion, or a recovery UI; manage accounts through Supabase until those workflows are added.
