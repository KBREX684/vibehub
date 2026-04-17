/**
 * Inline script runs before paint to reduce theme flash (P3-FE-1).
 */
export function ThemeScript() {
  const code = `
(function(){
  try {
    var k='vibehub-theme';
    var v=localStorage.getItem(k);
    if(!v){
      try{
        var m=document.cookie.match(/(?:^|;\\s*)vibehub_theme=([^;]+)/);
        if(m) v=decodeURIComponent(m[1]);
      }catch(e){}
    }
    if(!v) v='dark';
    var d=document.documentElement;
    function setDark(on){ d.classList.toggle('dark',on); d.classList.toggle('light',!on); }
    if(v==='dark') setDark(true);
    else if(v==='light') setDark(false);
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch(e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
