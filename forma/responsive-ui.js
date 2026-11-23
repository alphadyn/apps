export function setupResponsiveUI() {
  const sidebar = document.querySelector(".sidebar");
  const shell = document.querySelector(".app-shell");
  const menu = document.querySelector("#mobile-menu");
  const backdrop = document.querySelector("#navigation-backdrop");
  const close = document.querySelector("#close-navigation");
  const properties = document.querySelector("#toggle-properties");
  const inspector = document.querySelector("#design-inspector");
  const navigationMedia = matchMedia("(max-width: 1190px)");
  const compactMedia = matchMedia("(max-width: 780px)");
  let propertiesOpen = false;

  function setNavigation(open, restoreFocus = false) {
    open = navigationMedia.matches && open;
    sidebar.classList.toggle("open", open);
    sidebar.inert = navigationMedia.matches && !open;
    shell.inert = open;
    backdrop.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("navigation-open", open);
    if (open) close.focus();
    else if (restoreFocus && navigationMedia.matches) menu.focus();
  }
  function setProperties(open, focus = false) {
    propertiesOpen = open;
    inspector.hidden = compactMedia.matches && !open;
    properties.setAttribute("aria-expanded", String(open));
    properties.textContent = open ? "Hide properties" : "Properties";
    if (focus) {
      const target = open ? inspector : properties;
      target.scrollIntoView({ block: "start", behavior: "instant" });
      target.focus({ preventScroll: true });
    }
  }
  menu.onclick = () => setNavigation(!sidebar.classList.contains("open"), true);
  close.onclick = () => setNavigation(false, true);
  backdrop.onclick = () => setNavigation(false, true);
  properties.onclick = () => setProperties(!propertiesOpen, !propertiesOpen);
  document.querySelector("#return-to-canvas").onclick = () => setProperties(false, true);
  document.addEventListener("keydown", event => {
    if (!sidebar.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      setNavigation(false, true);
    } else if (event.key === "Tab") {
      const buttons = [...sidebar.querySelectorAll("a[href],button:not(:disabled),input,select")].filter(el => el.getClientRects().length);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  navigationMedia.addEventListener("change", () => setNavigation(false));
  compactMedia.addEventListener("change", () => setProperties(propertiesOpen));
  setNavigation(false);
  setProperties(false);
  return { closeNavigation: () => setNavigation(false, sidebar.classList.contains("open")) };
}
