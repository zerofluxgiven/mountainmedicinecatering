# Catering Management App
<!-- Trigger Firebase deploy -->



Instructions and structure overview.

## Parsing Engine
The app uses OpenAI to extract recipes, menus and other structured data.
Responses are requested in JSON format using the API's `response_format` option
to ensure valid output.

## Styling and navigation

All application styles live in `theme.css`. Mobile adjustments are wrapped in
media queries like `@media (max-width: 768px)` so a single stylesheet serves
both desktop and mobile users. The theme is injected once on startup via
`apply_theme()`.

Navigation is unified through the `render_top_navbar` component on desktop.
When mobile mode is enabled (`st.session_state["mobile_mode"]` set to `True`),
`render_mobile_navigation` renders a slide-out menu triggered by the hamburger
button in the mobile header.
