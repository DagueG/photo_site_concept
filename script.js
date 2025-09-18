const btn = document.getElementById('switchWorld');
const body = document.body;
const heroImg = document.getElementById('heroImg');

function swapImages(toVintage){
  const heroSrc = heroImg.getAttribute('src');
  const heroAlt = heroImg.getAttribute('data-alt');
  heroImg.setAttribute('src', toVintage ? heroAlt : heroSrc.replace('_alt',''));

  document.querySelectorAll('.grid img').forEach(img=>{
    const alt = img.getAttribute('data-alt');
    const src = img.getAttribute('src');
    img.setAttribute('src', toVintage ? alt : src.replace('_alt',''));
  });
}

btn.addEventListener('click', () => {
  body.classList.add('transitioning');

  setTimeout(() => {
    const enableVintage = !body.classList.contains('vintage');
    body.classList.toggle('vintage', enableVintage);
    swapImages(enableVintage);
  }, 400); // milieu de la transition

  setTimeout(() => {
    body.classList.remove('transitioning');
  }, 1000); // fin de transition
});
