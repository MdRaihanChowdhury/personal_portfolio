// Replace your old contact JS with this full block
// Make sure jQuery is loaded before this script

(function(){
  // ====== CONFIG ======
  var RECAPTCHA_SITE_KEY = '6Lc6ogksAAAAAJyq0v93EtxSBVI8niXohRK9MSej'; // <-- replace with your Site Key from Google
  // =====================

  var contactWidgetId = null;
  var modalWidgetId = null;
  var recaptchaLoaded = false;

  // Inject reCAPTCHA script with explicit render callback
  function loadRecaptchaScript() {
    if (document.querySelector('script[src*="google.com/recaptcha/api.js"]')) {
      // already present, try to init if grecaptcha present
      if (window.grecaptcha && window.grecaptcha.render) {
        initRecaptchaWidgets();
      } else {
        // wait a bit
        setTimeout(function(){ if(window.grecaptcha && window.grecaptcha.render) initRecaptchaWidgets(); }, 700);
      }
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?onload=initRecaptcha&render=explicit';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);

    // global callback called by the script
    window.initRecaptcha = function() {
      initRecaptchaWidgets();
    };
  }

  // Create containers inside forms if not present and render widgets
  function initRecaptchaWidgets() {
    try {
      // contact form container
      var contactForm = document.getElementById('contact-form-data');
      if (contactForm) {
        var existing = contactForm.querySelector('.g-recaptcha-container');
        if (!existing) {
          var cont = document.createElement('div');
          cont.className = 'g-recaptcha-container';
          // insert before submit button (find .contact-btn in form)
          var btnWrap = contactForm.querySelector('.contact-btn');
          if (btnWrap) btnWrap.parentNode.insertBefore(cont, btnWrap);
          else contactForm.appendChild(cont);
          existing = cont;
        }
        // render widget if not already
        if (typeof grecaptcha !== 'undefined' && contactWidgetId === null) {
          contactWidgetId = grecaptcha.render(existing, {
            'sitekey': RECAPTCHA_SITE_KEY
          });
          recaptchaLoaded = true;
        }
      }

      // modal form container
      var modalForm = document.getElementById('modal-contact-form-data');
      if (modalForm) {
        var existingM = modalForm.querySelector('.g-recaptcha-container');
        if (!existingM) {
          var contm = document.createElement('div');
          contm.className = 'g-recaptcha-container';
          // insert before modal submit area (find .modal_contact_btn parent)
          var modalBtnWrap = modalForm.querySelector('.modal_contact_btn');
          if (modalBtnWrap) modalBtnWrap.parentNode.insertBefore(contm, modalBtnWrap);
          else modalForm.appendChild(contm);
          existingM = contm;
        }
        if (typeof grecaptcha !== 'undefined' && modalWidgetId === null) {
          modalWidgetId = grecaptcha.render(existingM, {
            'sitekey': RECAPTCHA_SITE_KEY
          });
          recaptchaLoaded = true;
        }
      }

    } catch (err) {
      console.error('reCAPTCHA init error:', err);
    }
  }

  // Utility: get recaptcha token for widget (returns string or empty)
  function getRecaptchaToken(widgetId) {
    if (!recaptchaLoaded || typeof grecaptcha === 'undefined') return '';
    try {
      return grecaptcha.getResponse(widgetId); // empty string if not completed
    } catch (e) {
      console.error('getRecaptchaToken error', e);
      return '';
    }
  }

  // Ensure recaptcha script loads
  loadRecaptchaScript();

  // =======================
  // Contact form handler
  // =======================
  $(document).on('click', '.contact_btn', function (e) {
    e.preventDefault();
    var $btn = $(this);
    $btn.find('i').removeClass('d-none');

    var $form = $('#contact-form-data');
    var proceed = true;

    // Validate all inputs & textarea (no HTML change required)
    $form.find('input, textarea').each(function() {
      if (!$.trim($(this).val())) {
        proceed = false;
        $(this).addClass('is-invalid');
      } else {
        $(this).removeClass('is-invalid');
      }
    });

    if (!proceed) {
      Swal.fire({ icon: 'error', title: 'Oops...', html: 'Please fill all required fields (Name, Email, Message).' });
      $btn.find('i').addClass('d-none');
      return;
    }

    // Check recaptcha
    if (!recaptchaLoaded) {
      // recaptcha not loaded yet — try init and warn
      console.warn('reCAPTCHA not loaded yet. Trying to initialize.');
      if (window.initRecaptcha) window.initRecaptcha();
      Swal.fire({ icon: 'error', title: 'Please wait', html: 'reCAPTCHA is loading — try again in a second.' });
      $btn.find('i').addClass('d-none');
      return;
    }

    var token = getRecaptchaToken(contactWidgetId);
    if (!token || token.length === 0) {
      Swal.fire({ icon: 'error', title: 'Please verify', html: 'Please check the reCAPTCHA box to prove you are not a robot.' });
      $btn.find('i').addClass('d-none');
      return;
    }

    // Prepare data and append recaptcha token manually
    var pathArray = window.location.pathname.split('/');
    var secondLevelLocation = pathArray[3];
    var accessURL = secondLevelLocation ? "../vendor/contact-mailer.php" : "vendor/contact-mailer.php";

    // serialize form and append g-recaptcha-response
    var formData = $form.serialize();
    formData += (formData.length ? '&' : '') + 'g-recaptcha-response=' + encodeURIComponent(token);

    $.ajax({
      type: 'POST',
      url: accessURL,
      data: formData,
      dataType: 'json',
      timeout: 20000,
      success: function(response) {
        var output;
        if (response.type === 'error') {
          output = '<div class="alert-danger" style="padding:10px 15px; margin-bottom:30px;">' + response.text + '</div>';
        } else {
          output = '<div class="alert-success" style="padding:10px 15px; margin-bottom:30px;">' + response.text + '</div>';
          $form.find('input, textarea').val('');
          // reset recaptcha for next submit
          try { grecaptcha.reset(contactWidgetId); } catch(e){ console.warn('grecaptcha.reset failed', e); }
        }

        if ($("#result").length) {
          $("#result").hide().html(output).slideDown();
        } else {
          Swal.fire({
            icon: response.type === 'error' ? 'error' : 'success',
            title: response.type === 'error' ? 'Oops...' : 'Success!',
            html: '<div class="' + (response.type === 'error' ? 'text-danger' : 'text-success') + '">' + response.text + '</div>'
          });
        }
        $btn.find('i').addClass('d-none');
      },
      error: function(xhr, status, error) {
        console.error('AJAX Error:', status, error, xhr && xhr.responseText);
        Swal.fire({ icon: 'error', title: 'AJAX Error', html: 'Could not send message. Check console/network and contact-mailer.php.' });
        $btn.find('i').addClass('d-none');
      }
    });
  });


  // =======================
  // Modal contact handler
  // =======================
  $(document).on('click', '.modal_contact_btn', function (e) {
    e.preventDefault();
    var $btn = $(this);
    $btn.find('i').removeClass('d-none');

    var $form = $('#modal-contact-form-data');
    var proceed = true;

    $form.find('input, textarea').each(function() {
      if (!$.trim($(this).val())) {
        proceed = false;
        $(this).addClass('is-invalid');
      } else {
        $(this).removeClass('is-invalid');
      }
    });

    if (!proceed) {
      Swal.fire({ icon: 'error', title: 'Oops...', html: 'Please fill all required fields (Name, Email, Message).' });
      $btn.find('i').addClass('d-none');
      return;
    }

    if (!recaptchaLoaded) {
      if (window.initRecaptcha) window.initRecaptcha();
      Swal.fire({ icon: 'error', title: 'Please wait', html: 'reCAPTCHA is loading — try again in a second.' });
      $btn.find('i').addClass('d-none');
      return;
    }

    var token = getRecaptchaToken(modalWidgetId);
    if (!token || token.length === 0) {
      Swal.fire({ icon: 'error', title: 'Please verify', html: 'Please check the reCAPTCHA box in the modal.' });
      $btn.find('i').addClass('d-none');
      return;
    }

    var pathArray = window.location.pathname.split('/');
    var secondLevelLocation = pathArray[3];
    var accessURL = secondLevelLocation ? "../vendor/contact-mailer.php" : "vendor/contact-mailer.php";

    var formData = $form.serialize();
    formData += (formData.length ? '&' : '') + 'g-recaptcha-response=' + encodeURIComponent(token);

    $.ajax({
      type: 'POST',
      url: accessURL,
      data: formData,
      dataType: 'json',
      timeout: 20000,
      success: function(response) {
        var output;
        if (response.type === 'error') {
          output = '<div class="alert-danger" style="padding:10px 15px; margin-bottom:30px;">' + response.text + '</div>';
        } else {
          output = '<div class="alert-success" style="padding:10px 15px; margin-bottom:30px;">' + response.text + '</div>';
          $form.find('input, textarea').val('');
          try { grecaptcha.reset(modalWidgetId); } catch(e){ console.warn('grecaptcha.reset failed', e); }
        }

        if ($("#quote_result").length) {
          $("#quote_result").hide().html(output).slideDown();
        } else {
          Swal.fire({
            icon: response.type === 'error' ? 'error' : 'success',
            title: response.type === 'error' ? 'Oops...' : 'Success!',
            html: '<div class="' + (response.type === 'error' ? 'text-danger' : 'text-success') + '">' + response.text + '</div>'
          });
        }
        $btn.find('i').addClass('d-none');
      },
      error: function(xhr, status, error) {
        console.error('AJAX Error (modal):', status, error, xhr && xhr.responseText);
        Swal.fire({ icon: 'error', title: 'AJAX Error', html: 'Could not send message. Check console/network and contact-mailer.php.' });
        $btn.find('i').addClass('d-none');
      }
    });

  });

})(); // IIFE end
