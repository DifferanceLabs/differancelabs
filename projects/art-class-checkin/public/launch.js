// Runs before any asset or app initialization. Fragments never reach HTTP logs.
(() => {
  const token = new URLSearchParams(location.hash.slice(1)).get(
    "dl_launch_token",
  );
  if (token) {
    history.replaceState(null, "", location.pathname);
    window.__artLaunchToken = token;
  }
})();
