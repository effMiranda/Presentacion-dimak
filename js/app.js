let slide = 0;
const total = slides.length;
const slides = [...document.querySelectorAll('.slide')];
const progress = document.getElementById('progress');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const presentation = document.querySelector('.presentation');
let transitionTimer = null;
let resizeTimer = null;
let navigating = false;

function setSlide(nextIndex, direction = 1){
  if(nextIndex < 0 || nextIndex >= slides.length || nextIndex === slide) return;

  const oldSlide = slides[slide];
  const newSlide = slides[nextIndex];
  const enterX = direction >= 0 ? '34px' : '-34px';
  const exitX = direction >= 0 ? '-28px' : '28px';

  if(transitionTimer) clearTimeout(transitionTimer);

  slides.forEach((s, i) => {
    if(i !== slide && i !== nextIndex){
      s.classList.remove('is-active','is-leaving','is-preparing');
      s.style.removeProperty('--enter-x');
      s.style.removeProperty('--exit-x');
    }
  });

  newSlide.style.setProperty('--enter-x', enterX);
  oldSlide.style.setProperty('--exit-x', exitX);
  newSlide.classList.remove('is-active','is-leaving','is-preparing');

  // Keep the current slide fully visible while the next one is prepared.
  // This prevents a black frame during back/forward navigation.
  oldSlide.classList.add('is-leaving');
  oldSlide.classList.remove('is-active');

  // Separate the inactive and active states by a real browser frame.
  // This reliably restarts the entrance animations when revisiting a slide.
  requestAnimationFrame(() => {
    newSlide.classList.add('is-active');
    slide = nextIndex;
    updateControls();
  });

  transitionTimer = setTimeout(() => {
    oldSlide.classList.remove('is-leaving');
    oldSlide.style.removeProperty('--exit-x');
    newSlide.style.removeProperty('--enter-x');
  }, 720);
}

function next(){ if(slide < slides.length - 1) setSlide(slide + 1, 1); }
function prev(){ if(slide > 0) setSlide(slide - 1, -1); }

function updateControls(){
  progress.style.width = ((slide + 1) / total * 100) + '%';
  prevBtn.disabled = slide === 0;
  nextBtn.disabled = slide === slides.length - 1;
  progress.setAttribute('aria-valuenow', String(slide + 1));
  progress.setAttribute('aria-valuemax', String(total));
  presentation.dataset.slide = String(slide + 1);
  slides.forEach((el,index)=>el.setAttribute('aria-hidden', index === slide ? 'false' : 'true'));
}

function updateViewportScale(){
  const desktop = window.matchMedia('(min-width:1051px)').matches;
  slides.forEach(el => {
    const content = el.querySelector('.content');
    if(!content) return;
    if(!desktop){
      content.style.removeProperty('--content-scale');
      return;
    }
    // Use the compact desktop layout as the reference instead of shrinking
    // the whole presentation aggressively. This keeps F11 readable while
    // still giving a small safety margin on genuinely short screens.
    const usable = Math.max(620, window.innerHeight - 40);
    const scale = Math.min(1, Math.max(.92, usable / 760));
    content.style.setProperty('--content-scale', scale.toFixed(3));
  });
}

nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);

document.addEventListener('keydown', event => {
  if(document.body.classList.contains('lightbox-open')){
    if(event.key === 'Escape') closeImageLightbox();
    return;
  }
  if(['ArrowRight','PageDown',' '].includes(event.key)){ event.preventDefault(); next(); }
  if(['ArrowLeft','PageUp'].includes(event.key)){ event.preventDefault(); prev(); }
  if(event.key === 'Home'){ event.preventDefault(); if(slide !== 0) setSlide(0, -1); }
  if(event.key === 'End'){ event.preventDefault(); if(slide !== slides.length - 1) setSlide(slides.length - 1, 1); }
});

let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive:true});
document.addEventListener('touchend', e => {
  const delta = e.changedTouches[0].screenX - touchStartX;
  if(Math.abs(delta) > 50) delta < 0 ? next() : prev();
}, {passive:true});

slides.forEach((el, index) => {
  el.style.setProperty('--enter-x', index === 0 ? '0px' : '34px');
  el.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
  if(index === 0) el.classList.add('is-active');
  else el.classList.remove('is-active','is-leaving','is-preparing');
});

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateViewportScale, 50);
});

updateViewportScale();
updateControls();

// Visor de imágenes ampliadas (lightbox)
let imageLightbox = null;

function closeImageLightbox(){
  if(!imageLightbox) return;
  imageLightbox.classList.remove('is-open');
  document.body.classList.remove('lightbox-open');
  imageLightbox.setAttribute('aria-hidden','true');
  const previous = imageLightbox.dataset.previousFocus;
  if(previous){
    const target = document.getElementById(previous);
    if(target) target.focus();
  }
}

function openImageLightbox(img){
  if(!imageLightbox){
    imageLightbox = document.createElement('div');
    imageLightbox.className = 'image-lightbox';
    imageLightbox.setAttribute('role','dialog');
    imageLightbox.setAttribute('aria-modal','true');
    imageLightbox.setAttribute('aria-label','Imagen ampliada');
    imageLightbox.setAttribute('aria-hidden','true');
    imageLightbox.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Cerrar imagen">×</button>
      <img class="lightbox-image" alt="">
      <div class="lightbox-caption" aria-live="polite"></div>
    `;
    document.body.appendChild(imageLightbox);
    imageLightbox.addEventListener('click', event => {
      if(event.target === imageLightbox || event.target.closest('.lightbox-close')) closeImageLightbox();
    });
    imageLightbox.addEventListener('touchstart', event => event.stopPropagation(), {passive:true});
    imageLightbox.addEventListener('touchend', event => event.stopPropagation(), {passive:true});
  }

  const largeImage = imageLightbox.querySelector('.lightbox-image');
  const caption = imageLightbox.querySelector('.lightbox-caption');
  largeImage.src = img.currentSrc || img.src;
  largeImage.alt = img.alt || 'Imagen de la presentación';
  caption.textContent = img.alt || img.closest('figure')?.querySelector('figcaption')?.textContent || '';
  imageLightbox.dataset.previousFocus = img.id || '';
  imageLightbox.classList.add('is-open');
  imageLightbox.setAttribute('aria-hidden','false');
  document.body.classList.add('lightbox-open');
  imageLightbox.querySelector('.lightbox-close').focus();
}

document.querySelectorAll('.slide img').forEach((img,index) => {
  img.classList.add('zoomable-image');
  img.setAttribute('tabindex','0');
  img.setAttribute('role','button');
  img.setAttribute('aria-label', (img.alt || 'Ver imagen') + ' — ampliar');
  img.addEventListener('click', () => openImageLightbox(img));
  img.addEventListener('keydown', event => {
    if(event.key === 'Enter' || event.key === ' '){
      event.preventDefault();
      openImageLightbox(img);
    }
  });
});
