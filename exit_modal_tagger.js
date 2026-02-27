/* Exit Modal Tagger - inject into head. Run on every page. */
window.addEventListener("DOMContentLoaded",function(){
  var obs=new MutationObserver(function(){
    var m=document.querySelector("[class*='framer-5tw9zz']");
    if(m&&!m.getAttribute("data-exit-modal"))m.setAttribute("data-exit-modal","true");
  });
  obs.observe(document.body,{childList:true,subtree:true});
});
