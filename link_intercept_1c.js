<script>
;(function(){
var t=window._thyq;if(!t)return;
function injectFallback(type){type=type||"offramp";var id="thyq-offramp-fallback";var old=document.getElementById(id);if(old)old.remove();var w=window;var isHcp=type==="hcp";var wx=isHcp?w.thyquidityCancelHcp:w.thyquidityCancelOfframp,wc=isHcp?w.thyquidityConfirmHcp:w.thyquidityConfirmOfframp;var d=document.createElement("dialog");d.id=id;d.setAttribute("data-offramp-modal","true");if(isHcp)d.setAttribute("data-hcp-modal","true");d.style.cssText="border:none;border-radius:8px;padding:24px;max-width:360px;box-shadow:0 4px 24px rgba(0,0,0,0.3)";d.innerHTML='<p style="margin:0 0 16px;font-size:16px">'+(isHcp?"You are entering the Healthcare Professional section.":"You are leaving this site.")+'</p><div style="display:flex;gap:12px;justify-content:flex-end"><button type="button" data-thyq-fb-cancel>Cancel</button><button type="button" data-thyq-fb-confirm>Continue</button></div>';var c=d.querySelector("[data-thyq-fb-cancel]"),o=d.querySelector("[data-thyq-fb-confirm]");c.onclick=function(e){e.preventDefault();e.stopPropagation();d.close();if(wx)wx(d)};o.onclick=function(e){e.preventDefault();e.stopPropagation();d.close();if(wc)wc(d)};document.body.appendChild(d);d.showModal();return d}
window._thyqInjectFallback=injectFallback;
})();
</script>
