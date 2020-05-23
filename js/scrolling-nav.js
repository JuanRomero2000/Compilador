(function($) {
  "use strict"; // Start of use strict

 // Desplazamiento suave usando jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top - 56)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

// Cierra el menu sensible cuando se hace clic en un enlace de activación de desplazamiento
  $('.js-scroll-trigger').click(function() {
    $('.navbar-collapse').collapse('hide');
  });

  // Activar scrollspy para agregar la clase activa a los elementos de la barra de navegación en el desplazamiento
  $('body').scrollspy({
    target: '#mainNav',
    offset: 56
  });

})(jQuery); // End of use strict
