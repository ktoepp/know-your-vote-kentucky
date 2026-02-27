<script>
;(function(){
var Op="thyquidity_pending_offramp_url",Hp="thyquidity_pending_hcp_url",V="thyquidity_hcp_visited",H=["/hcp","/healthcare"];
var Dbg=function(t,d){console.log("[thyq] "+t,d!==undefined?d:"")};
function go(h){try{return new URL(h,location.origin).origin}catch(_){return null}}
function ih(p){p=(p||"").replace(/\/$/,"")||"/";return H.some(function(b){return p===b||p.indexOf(b+"/")===0})}
function gp(){var p=(location.pathname||"").replace(/\/$/,"")||"/";if(p!=="/")return p;var h=(location.hash||"").replace(/^#!?/,"");return h&&h[0]==="/"?h.replace(/\/$/,"")||"/":p}
function hid(m){if(!m)return;if(typeof m.close==="function"){m.close();if(m.id==="thyq-offramp-fallback")m.remove();return}m.style.cssText="display:none !important;visibility:hidden !important;pointer-events:none !important;opacity:0 !important";var e=m.parentElement;while(e&&e!==document.body){var s=getComputedStyle(e);if(s.position==="fixed"||s.position==="absolute"){e.style.setProperty("display","none","important");e.style.pointerEvents="none"}e=e.parentElement}}
window._thyq={Op:Op,Hp:Hp,V:V,H:H,Dbg:Dbg,go:go,ih:ih,gp:gp,hid:hid};
})();
</script>
