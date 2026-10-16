# MASTER PROMPT — FLORIANI FLOWERS
## Premium Flower E-Commerce Platform, Customer Experience, Delivery Management & Complete Admin Dashboard

You are acting as a **Principal Full-Stack Engineer, Senior UI/UX Designer, E-Commerce Architect, Database Designer, Security Engineer, and Quality Assurance Engineer**.

Your mission is to design, architect, implement, test, and polish a complete, production-oriented flower e-commerce platform named **Floriani Flowers**.

This must NOT be a generic flower shop template, a static landing page, a collection of disconnected UI screens, or a frontend-only demonstration.

Build a cohesive, beautiful, modern, fully responsive, functional flower e-commerce system with a premium customer-facing storefront and a comprehensive administrative dashboard.

The final result must feel like a real premium floral brand: elegant, emotional, modern, trustworthy, effortless to use, and visually memorable.

**Primary brand color:** `#781241`

**Instagram reference:** https://www.instagram.com/floriani.flowers/

The final logo will be provided later. Until then, create a sophisticated temporary text-based Floriani Flowers wordmark that can be replaced easily without redesigning the application.

Choose the remaining colors, typography, visual language, animations, spacing, and component styling yourself. They must complement `#781241` and create a refined, harmonious, non-aggressive premium floral aesthetic.

Do not ask me to choose every minor design detail. Make thoughtful professional decisions and maintain consistency throughout the entire application.

---

# PHASE 1 — MANDATORY PROJECT DISCOVERY AND SYSTEM ANALYSIS

Before implementing anything, inspect the existing project thoroughly.

## 1.1 Understand the existing codebase

Inspect:

- Project structure and directory organization.
- Existing framework, runtime, package manager, and dependencies.
- Existing frontend and backend architecture.
- Existing database schema and migration system.
- Authentication and authorization implementation.
- Existing API endpoints and integrations.
- Routing, layouts, and reusable components.
- Existing styling system and design tokens.
- Environment variables and configuration.
- Existing testing tools, linting, formatting, and TypeScript configuration.
- Any existing implementation that can be reused safely.

Read the project's `README`, `AGENTS.md`, architecture documentation, and all relevant development guidelines before modifying files.

If the project already contains established architectural conventions, respect them unless there is a clearly justified technical reason to improve them.

Do not destroy existing functionality, overwrite unrelated code, or replace working systems without understanding their dependencies.

## 1.2 Create an implementation plan

Before major implementation, establish:

1. Existing system architecture.
2. Required new functionality.
3. Database entities and relationships.
4. Customer journeys.
5. Administrator workflows.
6. Order lifecycle.
7. Delivery lifecycle.
8. Authentication and permission requirements.
9. Responsive design requirements.
10. External integrations and their limitations.
11. Testing strategy.
12. Deployment requirements.

Then implement the system in logical phases.

You must continue beyond planning. Do not stop after producing an architecture document or a task checklist.

## 1.3 Preserve the actual project stack

Do not arbitrarily migrate frameworks or rewrite the entire application.

Use the existing stack whenever appropriate.

If the project is currently only a frontend and requires a backend, implement a suitable backend using the project's existing ecosystem when feasible.

If an essential infrastructure component is missing, identify the smallest reliable addition that makes the complete system functional.

Never pretend that a backend, database, payment gateway, delivery integration, or external service exists when it has not actually been implemented.

---

# PHASE 2 — PREMIUM FLORIANI BRAND IDENTITY

Create a visually distinctive and cohesive identity for Floriani Flowers.

## 2.1 Design direction

The visual direction should combine:

- Contemporary luxury floral branding.
- Editorial-style photography.
- Refined typography.
- Elegant layouts with intentional whitespace.
- Sophisticated product presentation.
- Subtle botanical references.
- Soft, harmonious neutral backgrounds.
- Carefully controlled burgundy accents.
- Premium gift-shopping aesthetics.
- Smooth, natural motion.

Avoid generic marketplace aesthetics, overly saturated colors, excessive gradients, cheap-looking animations, unnecessary borders, and overcrowded layouts.

The website should look professionally art-directed rather than automatically generated from a generic template.

## 2.2 Color system

Use `#781241` as the primary brand color.

Develop a complete semantic color palette containing:

- Primary brand.
- Primary hover and active states.
- Soft burgundy surfaces.
- Warm white.
- Cream and ivory.
- Muted botanical green.
- Subtle neutral backgrounds.
- Primary and secondary text.
- Borders and dividers.
- Success, warning, error, and information states.

Ensure sufficient contrast and accessibility.

Define reusable design tokens rather than scattering arbitrary color values throughout the codebase.

The palette must remain visually consistent across the storefront, checkout, account pages, and admin dashboard.

## 2.3 Typography

Select an elegant typography system suitable for a premium flower brand.

Use expressive typography for important editorial headings and highly readable typography for product information, forms, navigation, prices, and administration tables.

If external fonts are used, provide sensible fallback fonts and avoid making the website unusable when font downloads fail.

## 2.4 Logo preparation

Create a clean temporary Floriani Flowers text-based brand identity.

The logo must be implemented through a centralized, reusable brand component.

Later, the owner should be able to replace the temporary wordmark with a real logo asset by changing one configuration or component.

Do not hardcode the brand logo independently across multiple unrelated components.

---

# PHASE 3 — INSTAGRAM RESEARCH AND PRODUCT CONTENT

Reference: https://www.instagram.com/floriani.flowers/

Inspect the public Instagram profile and publicly accessible posts when possible.

Use the available browser, research, or external-access capabilities if configured.

Research the following:

- Brand identity and visual style.
- Flower arrangements and bouquets.
- Available product categories.
- Product photography.
- Color combinations.
- Wrapping and presentation styles.
- Gift arrangements.
- Promotional themes.
- Brand tone and communication style.
- Seasonal products.
- Any publicly visible product names or relevant descriptions.

Use this information to inform the website's design and content.

## 3.1 Important access limitations

Instagram may restrict access to posts, images, captions, or other profile information.

If direct access is blocked:

- Do not claim that you inspected content you could not access.
- Do not bypass authentication or access controls.
- Use publicly accessible information where available.
- Build the storefront so real product information and photographs can be added later.
- Clearly separate verified information from illustrative sample content.

Do not assume that a product appearing in a photograph is available for purchase.

Do not invent actual business contact details, stock levels, delivery promises, or official prices.

## 3.2 Product imagery

Use high-quality floral photographs that match the premium brand direction.

Prioritize authentic product photography from authorized or publicly accessible sources when usage is appropriate.

If suitable images cannot be retrieved, use clearly replaceable sample images or authorized image sources.

Do not create broken image links or rely on temporary external URLs as the only source of essential product imagery.

Implement appropriate image optimization, responsive image sizing, lazy loading, and graceful fallback states.

Every product image must have a meaningful alternative text.

The administrator must be able to upload and manage the real product images later.

---

# PHASE 4 — CUSTOMER-FACING STOREFRONT

Build a complete customer-facing website that encourages customers to discover, select, personalize, and order flower arrangements with minimal friction.

The storefront must be polished on desktop, tablet, and mobile.

## 4.1 Homepage

Create a premium homepage with the following sections where appropriate:

### A. Navigation header

Include:

- Floriani Flowers logo.
- Home.
- Shop / Flowers.
- Categories.
- Occasions.
- About the brand.
- Contact.
- Search.
- Customer account.
- Shopping cart with a live item count.

The navigation must adapt intelligently to different screen sizes.

On mobile, use a compact and intuitive navigation pattern with a polished menu and easy access to the cart.

Avoid overcrowding the header.

### B. Hero section

Create a visually striking hero section featuring premium floral imagery, an elegant headline, concise supporting text, and a clear shopping call to action.

The hero must communicate the emotional value of flowers: celebrations, love, gratitude, birthdays, apologies, anniversaries, and meaningful everyday moments.

Use sophisticated composition, subtle motion, and carefully selected typography.

The hero must not prevent users from reaching products quickly.

### C. Featured categories

Display attractive category cards for relevant product groups, such as:

- Roses.
- Bouquets.
- Premium arrangements.
- Seasonal flowers.
- Romantic gifts.
- Birthday flowers.
- Anniversary arrangements.
- Flower boxes.
- Special occasions.

These are initial category suggestions, not verified statements about the current inventory.

Categories must be managed dynamically through the admin panel.

Clicking a category must navigate to the correct filtered product listing.

### D. Bestsellers

Show a curated selection of products.

Each product card should display:

- Main image.
- Product name.
- Current price.
- Optional previous price when a legitimate discount exists.
- Relevant badge, such as Bestseller or New.
- Favorite button if favorites are implemented.
- Quick-view or product-details action.
- Add-to-cart action when supported.

Only show bestseller badges and discounted prices when supported by real product data.

### E. Brand story

Create an elegant section explaining the emotional value and craftsmanship associated with floral gifts.

Do not fabricate specific business history, awards, partnerships, or operational claims.

Keep the content editable.

### F. Occasion-based shopping

Help customers choose flowers according to the occasion or intended recipient.

Examples:

- For birthdays.
- For anniversaries.
- For romantic occasions.
- For congratulations.
- For expressing gratitude.
- For sympathy, if the business offers such products.

All category and occasion destinations must work.

### G. Delivery information

Explain the available delivery methods, delivery coverage, and estimated delivery information using configurable business settings.

Never promise same-day delivery, free delivery, or a particular delivery time unless the business has configured and supports it.

### H. Testimonials and social proof

Support customer reviews and testimonials.

Clearly distinguish real customer reviews from sample content.

Never fabricate real customer identities, ratings, or verified-purchase claims.

If no genuine reviews exist, use a neutral brand-story section instead of presenting fake testimonials as real.

### I. Instagram-inspired gallery

Create an attractive gallery inspired by Floriani's public Instagram content when appropriate assets are available.

Make the section visually consistent with the brand.

If a live Instagram integration is unavailable, use locally managed gallery images rather than a broken embedded feed.

### J. Newsletter and footer

If newsletter signup is included, implement actual validation and an appropriate backend or integration.

The footer should include:

- Brand identity.
- Navigation links.
- Contact information from configurable business settings.
- Delivery information.
- Privacy policy.
- Terms and conditions.
- Returns or cancellation policy where applicable.
- Social links.
- Copyright information.

Do not invent real contact details.

---

# PHASE 5 — PRODUCT CATALOG AND DISCOVERY

Implement a fully functional product catalog.

## 5.1 Shop page

Provide:

- Responsive product grid.
- Category filtering.
- Price filtering.
- Availability filtering.
- Sorting by price.
- Sorting by newest.
- Sorting by relevance where supported.
- Sorting by popularity where actual data exists.
- Search by product name and relevant attributes.
- Clear active filters.
- Empty results state.
- Loading state.
- Error state.
- Pagination or efficient incremental loading.

Filtering, sorting, and pagination must operate on actual product data.

Avoid implementing controls that only change their appearance without changing the results.

Preserve applicable search and filter state in URL query parameters when practical.

## 5.2 Product cards

Build a reusable product card component.

Support:

- Responsive image ratios.
- Image hover transitions on desktop.
- Touch-friendly interactions on mobile.
- Accessible buttons.
- Clear product pricing.
- Stock or availability indicators.
- Loading and success feedback.
- Add-to-cart feedback.
- Optional favorites.

Do not allow the user to add unavailable products to the cart.

If inventory management is not configured, do not invent stock quantities.

## 5.3 Product details page

Every product must have a dedicated details page with a stable URL.

Display:

- Product image gallery.
- Main image and thumbnails.
- Product name.
- Price.
- Discount information when applicable.
- Product description.
- Flower types and composition when known.
- Approximate size or dimensions when provided.
- Color information when available.
- Availability.
- Quantity selection.
- Relevant category.
- Delivery information.
- Care instructions when provided.
- Add-to-cart button.
- Optional gift-message customization.
- Related products.
- Breadcrumb navigation.

Support image zoom or another intuitive way to inspect photographs.

Validate quantity against availability and business rules.

Make the purchase action prominent without making the interface feel aggressive.

On mobile, ensure the price, customization controls, and add-to-cart action are easy to reach.

## 5.4 Product content architecture

Products must be represented by proper typed data models.

A product may include:

- ID.
- Slug.
- Name.
- Description.
- Price.
- Optional compare-at price.
- Currency.
- Category relationship.
- Images.
- Composition.
- Color.
- Size.
- Availability.
- Optional stock quantity.
- Active status.
- Featured status.
- Created and updated timestamps.
- SEO metadata where appropriate.

Do not force every field to be required when the information is not available.

Validate data at both the client and server boundaries.

---

# PHASE 6 — CUSTOMER AUTHENTICATION AND ACCOUNTS

Implement real authentication and registration.

## 6.1 Registration

Support a secure registration flow with:

- Full name.
- Email.
- Password.
- Password confirmation.
- Terms acceptance where required.
- Clear validation.
- Duplicate email handling.
- Password strength feedback.
- Loading and error states.
- Success feedback.

If email verification is implemented, generate and verify secure, expiring tokens.

Do not simulate successful email verification without implementing the actual verification mechanism.

## 6.2 Login

Provide:

- Email and password login.
- Show/hide password control.
- Clear validation messages.
- Secure session handling.
- Forgot-password flow.
- Optional social authentication only if genuinely configured.

After successful login, redirect users appropriately without losing legitimate shopping intent.

## 6.3 Password recovery

Implement a secure password recovery process.

Use expiring, single-use tokens and avoid revealing whether an email address belongs to a registered account.

If email delivery is not configured, provide clear setup instructions instead of pretending emails have been sent.

## 6.4 Customer account dashboard

Allow customers to:

- View their profile.
- Update permitted profile information.
- Manage delivery addresses.
- Change their password.
- View order history.
- Open order details.
- Track delivery status.
- Review order totals.
- See available cancellation options.
- View saved favorites if implemented.

Users must only be able to access their own private information and orders.

Enforce ownership checks on the server, not only in the frontend.

---

# PHASE 7 — CART AND CHECKOUT

The checkout must be straightforward, trustworthy, and mobile-friendly.

## 7.1 Shopping cart

Implement:

- Add product.
- Remove product.
- Increase quantity.
- Decrease quantity.
- Update quantity.
- Display product image and name.
- Display unit price.
- Calculate line totals.
- Calculate subtotal.
- Calculate delivery fee.
- Calculate final total.
- Display any valid discount.
- Handle unavailable products.
- Handle changed prices.
- Empty-cart state.
- Continue-shopping action.

Recalculate important prices and totals on the server before creating an order.

Never trust client-submitted prices, discounts, delivery fees, or totals.

Persist the cart appropriately according to the existing architecture.

For authenticated customers, consider server-side cart persistence. For guest customers, support a practical session or local persistence mechanism.

Ensure that merging a guest cart into an authenticated account does not create duplicate or invalid quantities.

## 7.2 Checkout experience

Create a polished, guided checkout.

Collect only the information necessary to fulfill the order.

Depending on the configured business rules, support:

- Customer name.
- Phone number.
- Email.
- Delivery address.
- Recipient name, if different.
- Recipient phone, if necessary.
- Delivery date.
- Requested delivery time window, if supported.
- Gift message.
- Customer comments.
- Delivery method.
- Payment method.

Support both delivery and customer pickup if the business enables both options.

If pickup is selected, do not require a delivery address.

If delivery is selected, validate the address and coverage according to configured rules.

Provide a clear order summary throughout checkout.

Clearly display the subtotal, delivery fee, discounts, and final amount before order confirmation.

Prevent duplicate orders caused by repeated clicks or network retries.

Use an appropriate idempotency strategy when supported by the backend architecture.

## 7.3 Payment methods

Design the payment system to support configurable payment methods.

Potential options include:

- Cash on delivery.
- Cash on pickup.
- Online payment through a supported payment provider.

Initially, implement cash on delivery and cash on pickup if these methods match the business requirements.

Online payments must only be enabled after a legitimate provider has been configured and its payment flow has been implemented and tested.

Never collect or store raw card details directly.

Do not mark an order as paid simply because the customer clicked a payment button.

Represent payment status separately from order status.

---

# PHASE 8 — ORDER CREATION AND CUSTOMER ORDER TRACKING

Orders are a central part of the application. Implement them carefully.

## 8.1 Order data model

Create a reliable order model containing the appropriate fields:

- Internal order ID.
- Human-readable order number.
- Customer relationship when applicable.
- Customer name.
- Customer phone.
- Customer email.
- Delivery address when applicable.
- Delivery method.
- Delivery date.
- Requested time window.
- Order items.
- Product names and prices captured at order time.
- Product quantities.
- Line totals.
- Subtotal.
- Delivery fee.
- Discount amount.
- Final total.
- Payment method.
- Payment status.
- Order status.
- Customer comments.
- Gift message.
- Delivery notes.
- Assigned delivery person, if applicable.
- Vehicle or transport details, if applicable.
- Created timestamp.
- Updated timestamp.
- Relevant status history.

Capture immutable order-item snapshots so historical orders remain understandable even if the product is renamed, edited, or deleted later.

Use appropriate database constraints and transactional operations.

## 8.2 Order statuses

Design a clear order lifecycle.

Suggested statuses:

1. Pending confirmation.
2. Confirmed.
3. Preparing.
4. Ready for pickup or dispatch.
5. Out for delivery.
6. Delivered.
7. Completed.
8. Cancelled.
9. Delivery failed, when applicable.

Adapt these states to the actual business workflow.

Do not allow arbitrary status changes that violate the lifecycle.

Implement explicit rules for valid transitions.

For every important status change, preserve:

- Previous status.
- New status.
- Timestamp.
- Responsible administrator or system actor.
- Optional internal note.
- Optional customer-visible message.

The interface must communicate status changes clearly to both administrators and customers.

## 8.3 Customer order tracking

Customers must be able to open an order and see:

- Order number.
- Order date.
- Ordered products.
- Quantities.
- Product prices.
- Delivery information.
- Payment method and status.
- Current order status.
- Status history or a visual progress timeline.
- Customer comments associated with the order.
- Delivery tracking details when available.

Do not display internal administrative notes to customers.

If real-time updates are not available, use a reliable refresh or polling strategy where appropriate.

Do not claim live GPS tracking unless it has actually been implemented with a working location source.

---

# PHASE 9 — DELIVERY MANAGEMENT

Implement a complete delivery management workflow.

The administrator must be able to distinguish clearly between:

- Customer pickup.
- Store-prepared order awaiting pickup.
- Courier delivery.
- Delivery in progress.
- Delivered orders.
- Failed delivery attempts.

## 9.1 Delivery methods

Provide configurable delivery methods.

Each method should support relevant settings such as:

- Name.
- Description.
- Active status.
- Fee.
- Coverage rules.
- Estimated delivery duration.
- Applicable order constraints.

Business-specific settings must be managed centrally.

Do not hardcode business promises into multiple UI components.

## 9.2 Delivery assignment

For orders requiring delivery, allow administrators to assign a delivery person or delivery provider.

Store relevant assignment information.

Provide a way to update delivery status and add operational notes.

When a delivery person is assigned, the system should make the relevant order details accessible only to authorized personnel.

Do not expose unnecessary customer personal information.

## 9.3 Vehicle and transport information

When a delivery is performed using a vehicle, support optional operational information such as:

- Vehicle type.
- Vehicle make or model.
- Vehicle registration number.
- Assigned driver or courier.
- Delivery start time.
- Dispatch time.
- Delivery completion time.
- Delivery instructions.

For example, an administrator might record that a delivery is being completed by a car or moped.

These fields must be optional and configurable according to the delivery method.

Do not require a vehicle registration number for walking delivery or customer pickup.

## 9.4 Delivery timeline

Display a clear operational timeline for administrators.

Example:

Order confirmed → Preparing bouquet → Ready for dispatch → Courier assigned → Out for delivery → Delivered.

The timeline must reflect actual saved status history, not hardcoded sample events.

## 9.5 Delivery notifications

Create a notification architecture that can later support:

- Email notifications.
- SMS notifications.
- Messaging integrations.
- Customer account notifications.

Notify customers about meaningful order updates only when the relevant notification provider is configured.

Do not silently pretend a notification was delivered when it was not.

---

# PHASE 10 — COMPLETE ADMINISTRATIVE DASHBOARD

Create a dedicated administrative application with a consistent layout and a professional operational workflow.

The admin dashboard must be fully functional, not merely visually impressive.

Separate customer-facing routes from administrative routes.

Use proper role-based authorization on the server.

## 10.1 Admin layout

Include:

- Sidebar navigation.
- Top navigation bar.
- Page titles and breadcrumbs.
- Search where appropriate.
- Current administrator information.
- Notifications where supported.
- Responsive sidebar behavior.
- Main content area.
- Consistent loading, empty, and error states.

The admin interface should prioritize operational clarity and information density while preserving the brand's visual quality.

Do not make the dashboard resemble a consumer storefront.

## 10.2 Admin navigation

Organize the dashboard into logical modules:

1. Overview.
2. Orders.
3. Delivery management.
4. Products.
5. Categories.
6. Inventory, if stock tracking is enabled.
7. Customers.
8. Analytics.
9. Promotions and discounts, if implemented.
10. Reviews, if implemented.
11. Gallery and brand content.
12. Delivery settings.
13. Payment settings.
14. General store settings.
15. Administrator accounts and permissions, if required.

Only expose modules that are implemented or clearly identify modules that remain unavailable.

---

# PHASE 11 — COMPLETE CATEGORY CRUD

Implement full category management.

Administrators must be able to:

- View categories.
- Search categories.
- Create a category.
- Edit a category.
- Delete a category.
- Activate or deactivate a category.
- Set category display order.
- Assign a category image.
- Edit category descriptions.
- Configure a category slug.
- Configure featured status.
- Preview category appearance when practical.

Use a well-designed table or list with clear actions.

Create and edit forms must include proper validation.

## 11.1 Category deletion rules

Deleting a category must never silently destroy associated products.

Before deletion, determine whether products reference the category.

If products are associated with it, provide a safe and explicit resolution strategy.

Depending on the data model, allow the administrator to reassign products or prevent deletion until the relationship is resolved.

Use database constraints and server-side checks.

Prevent duplicate or conflicting slugs.

---

# PHASE 12 — COMPLETE PRODUCT CRUD

Implement full product management.

Administrators must be able to:

- View all products.
- Search products.
- Filter by category.
- Filter by availability.
- Filter by active status.
- Create products.
- Edit products.
- Delete products safely.
- Activate or deactivate products.
- Feature selected products.
- Change category assignments.
- Update prices.
- Configure legitimate discounts.
- Upload multiple product images.
- Reorder product images.
- Select a primary image.
- Remove images.
- Edit descriptions and product attributes.
- Configure product slugs.
- Manage inventory when supported.
- Preview the public product page.

## 12.1 Product creation and editing

Build a polished, validated product form.

Group fields logically:

- Basic information.
- Pricing.
- Category.
- Images.
- Composition and attributes.
- Availability.
- Inventory.
- Featured settings.
- SEO information.

Support image previews, uploading progress, upload errors, and image deletion.

Do not store temporary browser object URLs as permanent image references.

Use a suitable persistent storage mechanism for uploaded files.

Validate file type and size on the server.

Protect file upload endpoints against malicious or unexpected files.

## 12.2 Product deletion

Before deleting a product, evaluate its relationships to historical orders.

Historical order items must remain intact even when a catalog product is removed.

Use archival, soft deletion, or another safe strategy where appropriate.

Do not accidentally remove historical transaction records.

---

# PHASE 13 — ORDER MANAGEMENT IN ADMIN

Create a comprehensive order management module.

## 13.1 Orders overview

Provide:

- Order number.
- Customer.
- Phone number.
- Order date.
- Number of items.
- Order total.
- Payment method.
- Payment status.
- Order status.
- Delivery method.
- Assigned courier, when applicable.
- Delivery date.
- Relevant actions.

Support pagination, search, filtering, sorting, and responsive layouts.

Useful filters include:

- Today.
- Yesterday.
- Custom date range.
- Pending orders.
- Confirmed orders.
- Preparing orders.
- Orders awaiting dispatch.
- Orders out for delivery.
- Delivered orders.
- Cancelled orders.
- Payment status.
- Delivery method.

Filtering must be based on actual server data.

## 13.2 Order details

Opening an order must show a complete operational record.

Include:

- Customer information.
- Products and quantities.
- Historical item prices.
- Subtotal.
- Delivery fee.
- Discounts.
- Final total.
- Payment information.
- Delivery address.
- Delivery instructions.
- Gift message.
- Customer comments.
- Order status history.
- Delivery assignment.
- Vehicle information when applicable.
- Internal administrative notes.
- Customer-visible messages.

Separate internal notes from customer-visible comments at the data-model and UI levels.

Never accidentally expose internal operational information.

## 13.3 Admin order actions

Authorized administrators must be able to:

- Confirm an order.
- Reject or cancel an order according to business rules.
- Mark an order as preparing.
- Mark it as ready for dispatch.
- Assign a courier.
- Update delivery details.
- Mark it as out for delivery.
- Mark it as delivered.
- Record a failed delivery attempt.
- Add internal notes.
- Add customer-visible messages.
- Update payment status only through an authorized, valid workflow.

Each meaningful action must persist to the backend.

Validate all transitions on the server.

Use confirmation dialogs for destructive or consequential actions.

Record an audit trail for important administrative operations.

---

# PHASE 14 — ANALYTICS AND BUSINESS INTELLIGENCE

Build a real analytics dashboard that helps the owner understand daily business performance.

The analytics must be derived from actual persisted data.

Do not present hardcoded chart values as real business results.

If the database is empty, display a meaningful empty state instead of misleading numbers.

## 14.1 Date filters

Support:

- Today.
- Yesterday.
- Last 7 days.
- Last 30 days.
- This month.
- Previous month.
- Custom date range.

Use the business's configured timezone for daily boundaries.

Store timestamps consistently and convert them correctly for display.

Ensure that orders close to midnight are attributed to the correct business day.

## 14.2 Core metrics

Display relevant metrics such as:

- Total orders.
- Orders created.
- Confirmed orders.
- Completed orders.
- Cancelled orders.
- Pending orders.
- Gross order value.
- Delivered order value.
- Average order value.
- Delivery fees.
- Product units sold.
- Bestselling products.
- Best-performing categories.
- Payment method distribution.
- Delivery method distribution.
- Order status distribution.

Clearly distinguish revenue-related metrics from order totals.

Do not label total order value as profit.

Only calculate profit if reliable cost data is available and the formula is clearly defined.

Document how cancelled, refunded, unpaid, and incomplete orders affect each metric.

## 14.3 Daily analytics

For each selected day, show:

- Orders placed that day.
- Completed or delivered orders.
- Cancelled orders.
- Pending orders.
- Relevant order totals.
- Products ordered.
- Product quantities.
- Popular products.
- Delivery method breakdown.
- Payment status breakdown.

When an administrator selects a particular day, allow them to open the actual orders contributing to the displayed metrics.

## 14.4 Charts and reports

Use readable charts for:

- Orders over time.
- Order value over time.
- Product popularity.
- Category performance.
- Order status distribution.
- Delivery method distribution.

Charts must respond to selected filters.

Include accessible labels, legends, and useful empty states.

Do not overload the dashboard with decorative charts that do not help business decisions.

## 14.5 Export

If practical, implement CSV export for filtered orders and analytics.

Exports must respect the administrator's selected filters and permissions.

Do not export information that the current administrator is not authorized to access.

---

# PHASE 15 — CUSTOMER MANAGEMENT AND ADMINISTRATIVE SECURITY

Implement a customer management area where authorized administrators can view relevant customer information and order history.

Depending on the business requirements, support:

- Customer search.
- Customer details.
- Order history.
- Total number of orders.
- Relevant order totals.
- Contact details.
- Account status.

Avoid unnecessary exposure of sensitive personal information.

Do not provide unrestricted access to customer passwords or authentication secrets.

## 15.1 Roles and permissions

At minimum, distinguish ordinary customers from administrators.

If multiple staff members will operate the system, consider granular roles such as:

- Owner.
- Administrator.
- Order manager.
- Delivery manager.

Implement actual server-side permission checks.

Hiding a button in the frontend is not sufficient authorization.

Prevent users from assigning themselves administrative privileges.

Protect sensitive administrative operations.

## 15.2 Security requirements

Implement appropriate protections against:

- Unauthorized access.
- Broken object-level authorization.
- Privilege escalation.
- SQL injection.
- Cross-site scripting.
- Cross-site request forgery where applicable.
- Insecure session handling.
- Brute-force authentication attempts.
- Malicious file uploads.
- Mass assignment vulnerabilities.
- Invalid input.
- Duplicate order submission.
- Price manipulation.
- Unauthorized order status changes.

Use secure password hashing and established authentication mechanisms.

Never store plaintext passwords.

Never commit secrets, API keys, production credentials, or private tokens to the repository.

Use environment variables and document required configuration.

---

# PHASE 16 — ANIMATIONS AND INTERACTION DESIGN

The website should feel polished, responsive, and contemporary.

Use animation to improve the experience rather than distract from it.

## 16.1 Recommended motion

Consider:

- Subtle page transitions.
- Gentle hero image motion.
- Smooth product image transitions.
- Elegant navigation interactions.
- Refined button hover states.
- Cart drawer animations.
- Toast notifications.
- Modal transitions.
- Staggered product-card reveals.
- Subtle section entrance animations.
- Loading skeletons.
- Smooth dropdown transitions.
- Mobile navigation transitions.

Use the existing animation library if appropriate.

Otherwise, choose a suitable lightweight solution compatible with the project.

## 16.2 Performance and accessibility

Respect `prefers-reduced-motion`.

Do not animate every element continuously.

Avoid heavy animation libraries when CSS is sufficient.

Do not block essential content behind animations.

Ensure animations do not interfere with keyboard navigation, screen readers, or mobile responsiveness.

The experience must remain fast on average mobile devices.

---

# PHASE 17 — MOBILE-FIRST RESPONSIVENESS

Mobile usability is a critical requirement, not a final cosmetic adjustment.

Many customers will discover flowers through Instagram and place their orders directly from their phones.

Optimize the entire customer journey for mobile use.

## 17.1 Required responsive coverage

Test and refine the application at representative viewport sizes, including:

- Small mobile: approximately 320–360 px.
- Standard mobile: approximately 375–430 px.
- Large mobile.
- Tablet portrait.
- Tablet landscape.
- Laptop.
- Desktop.
- Wide desktop.

These are testing targets, not a requirement to hardcode layouts to individual devices.

## 17.2 Mobile storefront

Ensure:

- No unintended horizontal overflow.
- Readable typography.
- Comfortable tap targets.
- Correct product-grid behavior.
- Responsive product images.
- Accessible forms.
- Easy category browsing.
- Smooth mobile navigation.
- Comfortable quantity controls.
- Clear cart access.
- A practical checkout flow.
- Readable order summaries.
- Convenient customer account access.
- Proper keyboard and input behavior.

Use mobile-appropriate product layouts.

Consider a compact sticky add-to-cart area on product details pages when it improves usability.

Do not let sticky controls cover important content.

## 17.3 Mobile admin

The admin panel must also work on phones.

Provide responsive tables or alternative layouts where necessary.

Allow administrators to review orders, update statuses, manage delivery assignments, and perform essential product operations without requiring a desktop.

Avoid making desktop tables simply shrink until their content becomes unreadable.

---

# PHASE 18 — DATABASE AND BACKEND ARCHITECTURE

Build a reliable backend that supports the entire application.

Use the existing database and backend if suitable.

If new infrastructure is necessary, select it based on compatibility, security, maintainability, and deployment requirements.

## 18.1 Suggested domain entities

Adapt the actual schema to the existing architecture.

Potential entities include:

- Users.
- Roles or permissions.
- Customer profiles.
- Addresses.
- Categories.
- Products.
- Product images.
- Inventory records, if supported.
- Carts and cart items, if server-persisted.
- Orders.
- Order items.
- Order status history.
- Payments.
- Delivery methods.
- Delivery assignments.
- Couriers or delivery personnel.
- Vehicle details.
- Notifications.
- Product reviews.
- Favorites.
- Promotions.
- Store settings.
- Audit logs.

Do not create unnecessary tables simply because they appear in this list.

Normalize relationships where appropriate.

Use foreign keys, indexes, unique constraints, and transactions where needed.

## 18.2 Backend requirements

Implement:

- Typed request and response models.
- Server-side validation.
- Centralized error handling.
- Authentication middleware.
- Authorization middleware.
- Consistent API response conventions.
- Pagination.
- Search and filtering.
- Transactional order creation.
- Safe order status transitions.
- Correct historical price snapshots.
- Appropriate logging.
- Database migrations.
- Reliable image-storage integration.
- API documentation where practical.

Never rely on frontend validation as the only validation layer.

## 18.3 API design

Create endpoints or equivalent server actions for all implemented business operations.

At a minimum, the system must support the real operations required for:

- Authentication.
- Customer profiles.
- Public product browsing.
- Product details.
- Categories.
- Cart management.
- Checkout.
- Order creation.
- Customer order history.
- Customer order tracking.
- Admin product CRUD.
- Admin category CRUD.
- Admin order management.
- Delivery assignment and updates.
- Analytics.
- Store settings.
- Product image uploads.

Use the conventions appropriate to the current framework.

Do not create fake API implementations that return static values when the UI expects real persisted data.

---

# PHASE 19 — SEO, ACCESSIBILITY, AND PERFORMANCE

## 19.1 SEO

Implement appropriate:

- Page titles.
- Meta descriptions.
- Canonical URLs where needed.
- Product metadata.
- Category metadata.
- Social sharing metadata.
- Open Graph images where available.
- Semantic headings.
- Descriptive image alternative text.
- Clean product URLs.
- Sitemap generation where supported.
- Robots directives.
- Structured product data when accurate and appropriate.

Do not expose private account pages, checkout information, or administrative routes to search engines.

Do not include fabricated product ratings, review counts, availability, or prices in structured data.

## 19.2 Accessibility

Use semantic HTML and accessible interaction patterns.

Support:

- Keyboard navigation.
- Visible focus states.
- Proper labels.
- Accessible form validation.
- Screen-reader-friendly status updates.
- Appropriate contrast.
- Accessible dialogs.
- Meaningful button names.
- Reduced-motion preferences.

Do not use clickable `div` elements when semantic buttons or links are appropriate.

## 19.3 Performance

Optimize:

- Image sizes.
- Image loading.
- JavaScript bundle size.
- Route loading where appropriate.
- Database queries.
- Pagination.
- Repeated API requests.
- Rendering behavior.
- Layout stability.

Avoid unnecessary dependencies and duplicated data-fetching logic.

Measure actual performance where tools are available rather than claiming performance scores that have not been measured.

---

# PHASE 20 — REAL-WORLD EDGE CASES

Systematically handle cases that can break a real flower ordering business.

At minimum, consider:

1. A product becomes unavailable while a customer is checking out.
2. A product price changes after it has been added to the cart.
3. A category is deleted while products still reference it.
4. A product is deleted after appearing in a historical order.
5. A customer submits checkout multiple times.
6. The browser refreshes after order submission.
7. A network error occurs during payment or order creation.
8. An administrator updates an order while another administrator is editing it.
9. A customer attempts to access another customer's order.
10. A delivery date is outside supported delivery rules.
11. A customer selects pickup but enters unnecessary delivery information.
12. A customer selects delivery but omits a required address.
13. An invalid delivery method is submitted directly to the API.
14. An administrator attempts an invalid status transition.
15. A courier assignment is removed after dispatch.
16. A payment callback is repeated.
17. An uploaded image is invalid or too large.
18. An image-storage service is unavailable.
19. Analytics are requested for a date with no orders.
20. An order is cancelled after being included in analytics.
21. A timezone difference moves an order across a reporting boundary.
22. A user loses authentication during checkout.
23. A database operation fails midway through order creation.
24. An administrator lacks permission for an operation.
25. A mobile user submits a form while the network is slow.
26. A product image fails to load.
27. A customer requests an unsupported delivery time.
28. A delivery fails and needs another attempt.
29. A customer places an order without registering, if guest checkout is enabled.
30. A category or product slug conflicts with an existing route.

For every relevant case, define and implement the correct behavior.

Do not solve these issues exclusively through visual messages. Enforce critical rules in the appropriate backend or database layer.

---

# PHASE 21 — TESTING AND QUALITY ASSURANCE

The application is not complete merely because it renders without an obvious error.

Run the available quality checks.

## 21.1 Code quality

Run the relevant commands for:

- Dependency and build validation.
- TypeScript type checking.
- Linting.
- Formatting checks where configured.
- Production build.
- Unit tests.
- Integration tests.
- End-to-end tests where practical.

Use the actual commands supported by the repository.

Do not hide errors by disabling TypeScript, weakening validation, suppressing lint rules unnecessarily, or adding broad ignore directives.

Do not introduce unnecessary `any` types.

Follow the existing project conventions.

## 21.2 Functional testing

Verify the complete critical user journey:

1. Open the homepage.
2. Browse categories.
3. Open a product.
4. Select quantity or customization.
5. Add the product to the cart.
6. Update the cart.
7. Proceed to checkout.
8. Submit valid customer and delivery information.
9. Create an order.
10. Verify that the order is persisted.
11. Open the order in the admin panel.
12. Confirm the order.
13. Update preparation status.
14. Assign delivery information where applicable.
15. Update delivery status.
16. Mark the order as delivered.
17. Verify that the customer can see the updated order status.
18. Verify that analytics reflect the correct data.

Also test:

- Invalid forms.
- Unauthorized admin requests.
- Unauthorized customer order access.
- Product CRUD.
- Category CRUD.
- Image upload and deletion.
- Analytics date filtering.
- Empty database states.
- Mobile navigation.
- Responsive checkout.
- Error recovery.

## 21.3 Browser verification

If browser automation or browser inspection tools are available, use them to inspect the actual rendered website.

Check for:

- Broken layouts.
- Horizontal overflow.
- Incorrect spacing.
- Missing images.
- Broken navigation.
- Nonfunctional buttons.
- Modal issues.
- Console errors.
- Failed network requests.
- Mobile-specific defects.

Fix the problems discovered.

Do not claim that browser-based testing was completed if no browser testing was performed.

---

# PHASE 22 — IMPLEMENTATION WORKFLOW

Execute the work incrementally.

### Step 1: Inspect

Understand the repository, documentation, architecture, and existing functionality.

### Step 2: Plan

Define the implementation phases, data models, routes, APIs, and key dependencies.

### Step 3: Establish the foundation

Create or refine the design system, application layout, routing, configuration, and reusable components.

### Step 4: Build the storefront

Implement the homepage, categories, catalog, product details, responsive navigation, and brand presentation.

### Step 5: Implement authentication

Create secure registration, login, password recovery, and customer account flows.

### Step 6: Implement cart and checkout

Connect the real cart, server-side pricing, validation, order creation, and supported payment methods.

### Step 7: Implement order and delivery workflows

Create order history, status transitions, delivery assignment, delivery tracking, and relevant notifications.

### Step 8: Build the admin dashboard

Implement overview, product CRUD, category CRUD, order management, delivery management, customer management, and analytics.

### Step 9: Integrate persistent storage

Verify that data survives refreshes and application restarts where expected.

### Step 10: Refine visual quality

Polish typography, spacing, responsive layouts, imagery, animations, loading states, and interaction feedback.

### Step 11: Test the entire system

Run quality checks and verify critical workflows end to end.

### Step 12: Document deployment

Document environment variables, database setup, migrations, image storage, authentication configuration, email configuration, payment integrations, and deployment procedures.

You may adjust this sequence when project dependencies require a different order, but do not omit critical functionality.

---

# PHASE 23 — STRICT ENGINEERING RULES

These rules are mandatory.

1. **Do not deliver a static mockup instead of a functional application.**
2. Do not implement fake login, fake registration, fake checkout, or fake order tracking.
3. Do not use hardcoded analytics as actual business data.
4. Do not create buttons that have no meaningful behavior.
5. Do not leave forms disconnected from their intended operations.
6. Do not trust client-submitted prices or order totals.
7. Do not expose private customer information to unauthorized users.
8. Do not rely on frontend-only authorization.
9. Do not break existing functionality without a documented reason.
10. Do not rewrite the architecture unnecessarily.
11. Do not create duplicate components when existing reusable components are suitable.
12. Do not introduce unnecessary dependencies.
13. Do not commit secrets.
14. Do not disable type checking to make the build pass.
15. Do not claim that an external integration works before verifying it.
16. Do not fabricate Instagram research, business details, reviews, or product availability.
17. Do not remove database relationships without understanding their consequences.
18. Do not allow category or product deletion to destroy historical order integrity.
19. Do not use inaccessible or excessively small mobile controls.
20. Do not leave broken links, placeholder buttons, or accidental horizontal scrolling.
21. Do not ignore error, loading, success, and empty states.
22. Do not stop after implementing the homepage.
23. Do not stop after implementing only the frontend.
24. Do not mark an incomplete feature as completed.
25. Do not silently skip failed tests.
26. Do not replace working project configuration with arbitrary defaults.
27. Do not introduce mock data into production analytics.
28. Do not make destructive database changes without understanding their impact.
29. Do not claim that deployment succeeded without verifying the result.
30. Do not sacrifice functional correctness for visual effects.

When credentials, external services, or business decisions are unavailable, implement the parts that can be completed safely and document precisely what remains dependent on configuration.

---

# PHASE 24 — FINAL ACCEPTANCE CRITERIA

The implementation is ready only when the following requirements have been addressed.

## Customer storefront

- [ ] Premium Floriani Flowers identity.
- [ ] Primary color `#781241`.
- [ ] Responsive homepage.
- [ ] Dynamic category browsing.
- [ ] Search, sorting, and filtering.
- [ ] Product cards and details pages.
- [ ] Product image galleries.
- [ ] Real cart functionality.
- [ ] Validated checkout.
- [ ] Secure authentication.
- [ ] Customer profile and order history.
- [ ] Order status tracking.
- [ ] Delivery and pickup support according to configuration.
- [ ] Clear order confirmation and error handling.
- [ ] High-quality mobile experience.

## Administration

- [ ] Protected administrative routes.
- [ ] Server-side authorization.
- [ ] Admin overview.
- [ ] Full category CRUD.
- [ ] Full product CRUD.
- [ ] Product image management.
- [ ] Order listing and detailed order view.
- [ ] Validated order status transitions.
- [ ] Customer comments and separate internal notes.
- [ ] Delivery assignment and delivery status management.
- [ ] Optional vehicle and driver information.
- [ ] Analytics with real persisted data.
- [ ] Daily and custom date-range reporting.
- [ ] Relevant order and product breakdowns.
- [ ] Customer management.
- [ ] Responsive administration.

## Engineering

- [ ] Database persistence.
- [ ] Appropriate migrations and constraints.
- [ ] Correct server-side pricing.
- [ ] Historical order-item snapshots.
- [ ] Secure authentication and authorization.
- [ ] Input validation.
- [ ] Error handling.
- [ ] Environment configuration.
- [ ] Type checking.
- [ ] Linting.
- [ ] Production build.
- [ ] Critical workflow testing.
- [ ] Deployment documentation.

Do not check off an item merely because a corresponding screen exists. Verify its actual behavior.

If a feature cannot be completed because of unavailable credentials or infrastructure, mark it as blocked or partially implemented and explain the dependency.

---

# PHASE 25 — FINAL DELIVERY REPORT

When implementation and verification are complete, provide a concise but technically accurate report containing:

1. What was implemented.
2. The main architectural decisions.
3. Important routes and application modules.
4. Database changes and migrations.
5. Implemented API operations.
6. Authentication and permission behavior.
7. Product, category, order, and delivery functionality.
8. Analytics capabilities.
9. Responsive design improvements.
10. Tests and commands actually executed.
11. Test and build results.
12. Known issues or incomplete functionality.
13. Required environment variables.
14. External services that still need configuration.
15. Exact instructions for running the application locally.
16. Deployment instructions or remaining deployment steps.

Clearly distinguish between completed, tested, partially implemented, and blocked functionality.

Never report a successful test, integration, or deployment that was not actually verified.

---

# FINAL EXECUTION INSTRUCTION

Begin by inspecting the repository and reading its relevant instructions.

Then establish the architecture and implementation plan.

After that, **start implementing the real application immediately and continue through the required phases without stopping at the planning stage**.

Make reasonable decisions independently. Prioritize the highest-value dependencies first. Keep the code maintainable, the user experience exceptional, and the business logic correct.

If the project is too large to complete in one uninterrupted operation, implement it incrementally in coherent, working stages. Preserve completed work, document remaining tasks, and continue with the next highest-priority phase rather than repeatedly redesigning the plan.

The ultimate goal is a beautiful, premium, secure, responsive, maintainable, and genuinely usable Floriani Flowers e-commerce platform where customers can confidently order flowers from their phones and administrators can manage the actual business from one centralized dashboard.

**Build a real product, not just a beautiful picture of one.**


Stack = Frontent => Backend => Next.js only, database => Mongo db Atlas,