let currentSlideIndex = 0;
const slides = document.querySelectorAll('.book-card');
const dots = document.querySelectorAll('.dot');


function showSlides(index) {
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }

    
    slides.forEach((slide, i) => {
        slide.style.transform = `translateX(${(i - currentSlideIndex) * (50 )}%)`; 
    });

    dots.forEach((dot, i) => {
        dot.classList.remove('active');
        if (i === currentSlideIndex) {
            dot.classList.add('active');
        }
    });
}


function nextSlide() {
    showSlides(currentSlideIndex + 1);
}

function prevSlide() {
    showSlides(currentSlideIndex - 1);
}

function currentSlide(index) {
    showSlides(index - 1);
}

document.addEventListener('DOMContentLoaded', () => {
    showSlides(currentSlideIndex); // Initial slide setup
});

document.addEventListener('DOMContentLoaded', () => {
  const bookCards = document.querySelectorAll('.book-card');

  bookCards.forEach(card => {
      card.addEventListener('click', function() {
          const postId = this.getAttribute('data-post-id');
          if (postId) {
              
              window.location.href = `/book?post_id=${postId}&from=home`;
          }
      });
    });
  });

  // Wrap every letter in a span
  document.addEventListener('DOMContentLoaded', function() {
    var textWrapper = document.querySelector('.ml2');
    textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");

    anime.timeline({loop: true})
      .add({
        targets: '.ml2 .letter',
        scale: [4, 1],
        opacity: [0, 1],
        translateZ: 0,
        easing: "easeOutExpo",
        duration: 950,
        delay: (el, i) => 100 * i
      }).add({
        targets: '.ml2',
        opacity: 0,
        duration: 1000,
        easing: "easeOutExpo",
        delay: 1000
      });
});


