// Keep browser page zoom separate from the canvas Pointer Events gestures.
// Safari may ignore viewport zoom limits; cancel its native gesture default only.
function preventPageZoom(event) {
 if(event.cancelable) event.preventDefault();
}
document.addEventListener('gesturestart',preventPageZoom,{passive:false});
document.addEventListener('gesturechange',preventPageZoom,{passive:false});

if('serviceWorker' in navigator && window.isSecureContext){
 let reloading=false;
 window.addEventListener('bead-apply-update',()=>{reloading=true;});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
 navigator.serviceWorker.register('/sw.js').then(reg=>{
 const announce=()=>window.dispatchEvent(new Event('bead-update'));
 if(reg.waiting)announce();
 reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')announce();});});

 }).catch(()=>{});
}
