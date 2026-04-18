/**
 * Inline script runs before paint to reduce theme flash (P3-FE-1).
 */
export function ThemeScript() {
  const code = `
(function(){
  try {
    var d=document.documentElement;
    d.classList.add('dark');
    d.classList.remove('light');
    try {
      localStorage.setItem('vibehub-theme','dark');
      document.cookie='vibehub_theme=dark;path=/;max-age=31536000;SameSite=Lax';
    } catch(e) {}
  } catch(e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
