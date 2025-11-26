$(document).ready(function() {
    
    var currentStep = 1;
    var $needsCheckboxes = $('#step-1 input[name="needs"]');
    var $siteCheckbox = $needsCheckboxes.filter('[value="site"]');
    var $otherCheckboxes = $needsCheckboxes.not('[value="site"]');
    
    // Initialisation Flatpickr
    flatpickr("#maquette-date-picker", {
        "locale": "fr", 
        dateFormat: "d/m/Y", 
        minDate: "today" 
    });

    // Scroll
    function scrollToWizardTop() {
        $('html, body').animate({
            scrollTop: $('body').offset().top - 20
        }, 400); 
    }

    // Erreurs
    function showError(step, message) {
        var $errorDiv = $('#step-' + step + ' .sim-error-message');
        $errorDiv.text(message).slideDown();
        scrollToWizardTop();
    }
    function hideError(step) {
        var $errorDiv = $('#step-' + step + ' .sim-error-message');
        $errorDiv.slideUp();
    }
    
    // Helper HubSpot
    function setHubSpotValue($field, value) {
        if ($field.length === 0) {
            return;
        }
        $field.val(value);
        var nativeInput = $field[0];
        var inputEvent = new Event('input', { bubbles: true });
        var changeEvent = new Event('change', { bubbles: true });
        nativeInput.dispatchEvent(inputEvent);
        nativeInput.dispatchEvent(changeEvent);
    }
    
    // --- Logique d'exclusion mutuelle (Etape 1) ---
    $needsCheckboxes.on('change', function() {
        hideError(1);
        var $clicked = $(this);
        var isSite = $clicked.val() === 'site';

        if (isSite) {
            if ($clicked.is(':checked')) {
                $otherCheckboxes.prop('checked', false).prop('disabled', true);
                $otherCheckboxes.closest('.option-box').addClass('disabled-option');
            } else {
                $otherCheckboxes.prop('disabled', false);
                $otherCheckboxes.closest('.option-box').removeClass('disabled-option');
            }
        } else {
            if ($otherCheckboxes.is(':checked')) {
                $siteCheckbox.prop('checked', false).prop('disabled', true);
                $siteCheckbox.closest('.option-box').addClass('disabled-option');
            } else {
                $siteCheckbox.prop('disabled', false);
                $siteCheckbox.closest('.option-box').removeClass('disabled-option');
            }
        }
    });
    
    // --- Logique Toggle Blog ---
    $('#blog-toggle-site').on('change', function() {
        var $subRow = $('#blog-additionnel-site');
        var $basePriceInput = $('#blog-base-price-site');
        
        if ($(this).is(':checked')) {
            $subRow.slideDown(); 
            $basePriceInput.val(1); 
        } else {
            $subRow.slideUp(); 
            $subRow.find('.sim-input').val(0).trigger('input'); 
            $basePriceInput.val(0); 
        }
    });

    // --- Logique Design ---
    $('input[name="design-status"]').on('change', function() {
        hideError(3);
        var selectedValue = $(this).val();
        $('.design-sub-field').slideUp();
        
        if (selectedValue === 'oui') {
            $('#design-field-oui').slideDown();
        } else if (selectedValue === 'non') {
            $('#design-field-non').slideDown();
        } else if (selectedValue === 'aide') {
            $('#design-field-aide').slideDown();
        }
    });
    
    // --- Boutons +/- ---
    $(document).on('click', '.qty-btn', function() {
        if ($(this).is(':disabled')) {
            return;
        }
        var $btn = $(this);
        var $input = $btn.siblings('.sim-input');
        var action = $btn.data('action');
        var oldValue = parseFloat($input.val()) || 0;
        var newValue;

        if (action === 'plus') {
            newValue = oldValue + 1;
        } else { // minus
            newValue = (oldValue > 0) ? oldValue - 1 : 0;
        }

        $input.val(newValue);
        $input.trigger('input'); 
    });
    
    // --- Saisie ---
    $(document).on('input', '.sim-input', function() {
        var $input = $(this);
        if ($input.is('[readonly]')) {
            return;
        }

        var $step = $input.closest('.sim-step');
        if ($step.attr('id') === 'step-2') {
            hideError(2);
        }
        if ($step.attr('id') === 'step-4') {
            updateFinalTotal();
        }
    });


    // --- NAVIGATION Suivant ---
    $('.btn-next').on('click', function() {
        // Etape 1
        if (currentStep === 1) {
            if ($('input[name="needs"]:checked').length === 0) {
                showError(1, "Veuillez sélectionner au moins un type de besoin.");
                return;
            }
            hideError(1);
            prepareStep2();
        }
        
        // Etape 2
        if (currentStep === 2) {
            var isSitePath = $('input[value="site"]').is(':checked');
            var isTemplatesPath = $('input[value="templates"]').is(':checked');

            if (isSitePath || isTemplatesPath) {
                var totalEnteredTemplates = 0;
                $('#step-2 .detail-section').filter(function() { 
                    return $(this).css('display') === 'block'; 
                }).find('.sim-input.input-calc').each(function() {
                    totalEnteredTemplates += (parseFloat($(this).val()) || 0);
                });

                if (totalEnteredTemplates === 0) {
                    showError(2, "Veuillez renseigner au moins 1 template pour continuer.");
                    return;
                }
            }
            hideError(2);
        }
        
        // Etape 3
        if (currentStep === 3) {
            if ($('input[name="design-status"]:checked').length === 0) {
                showError(3, "Veuillez indiquer le statut de vos maquettes.");
                return;
            }
            hideError(3);
            buildSummaryStep();
            updateFinalTotal();
            saveToLocalStorage();
        }

        // Navigation
        if (currentStep < 4) { 
            currentStep++;
            updateStepDisplay();
            scrollToWizardTop();
        }
    });

    // --- Etape 4 -> 5 ---
    $(document).on('click', '#btn-go-to-form', function() {
        if (currentStep === 4) {
            currentStep = 5;
            updateStepDisplay();
            scrollToWizardTop();
            
            let simData = JSON.parse(localStorage.getItem('hubSimData'));
            if (simData) {
                waitForFormAndPopulate(simData);
            } else {
                console.warn("Simulateur: Données localStorage non trouvées.");
            }
        }
    });

    // --- Précédent ---
    $('.btn-prev').on('click', function() {
        if (currentStep > 1) {
            currentStep--;
            updateStepDisplay();
            scrollToWizardTop();
        }
    });

    // --- Affichage + Barre de progression (MIS À JOUR V6.0) ---
    function updateStepDisplay() {
        $('.sim-step').removeClass('active');
        $('#step-' + currentStep).addClass('active'); 
        
        $('.step-indicator').removeClass('active');
        $('.step-indicator[data-step]').each(function() {
            if ($(this).data('step') <= currentStep) {
                $(this).addClass('active');
            }
        });
        $('.step-indicator[data-step="' + currentStep + '"]').addClass('active');

        // Mise à jour de la barre de progression
        var progressPercent = (currentStep / 5) * 100; // 5 étapes au total
        $('.sim-progress-bar').css('width', progressPercent + '%');
    }

    // --- Prepare Etape 2 ---
    function prepareStep2() {
        $('.detail-section').hide(); 
        $('input[name="needs"]:checked').each(function() {
            var val = $(this).val();
            $('#detail-' + val).fadeIn();
        });
    }

    // --- Build Etape 4 ---
    function buildSummaryStep() {
        var summaryHtml = '';
        var $activeSections = $('#step-2 .detail-section').filter(function() {
            return $(this).css('display') === 'block';
        });

        $activeSections.each(function() {
            var $section = $(this);
            $section.find('.input-calc').each(function() {
                var $input = $(this);
                var qty = parseFloat($input.val()) || 0; 
                var price = $input.data('price');
                var label = $input.data('label');
                
                if ($input.attr('type') === 'hidden') {
                    if (qty > 0) {
                        summaryHtml += `
                            <div class="sim-row">
                                <div class="label-with-helper">
                                    <label>${label}</label>
                                    <small class="sim-helper-text">Forfait (Index + Article)</small>
                                </div>
                                <div class="qty-input-wrapper disabled-locked">
                                    <button type="button" class="qty-btn" data-action="minus" aria-label="Retirer 1" disabled>-</button>
                                    <input type="number" class="sim-input input-calc" 
                                           data-label="${label}" 
                                           data-price="${price}" 
                                           min="1" 
                                           value="1" 
                                           readonly>
                                    <button type="button" class="qty-btn" data-action="plus" aria-label="Ajouter 1" disabled>+</button>
                                </div>
                            </div>
                        `;
                    }
                } else if (qty > 0) {
                    var $labelContainer = $input.closest('.sim-row').find('.label-with-helper, label').first();
                    summaryHtml += `
                        <div class="sim-row">
                            ${$labelContainer.clone().wrap('<div>').parent().html()}
                            <div class="qty-input-wrapper">
                                <button type="button" class="qty-btn" data-action="minus" aria-label="Retirer 1">-</button>
                                <input type="number" class="sim-input input-calc" 
                                       data-label="${label}" 
                                       data-price="${price}" 
                                       min="0" 
                                       value="${qty}">
                                <button type="button" class="qty-btn" data-action="plus" aria-label="Ajouter 1">+</button>
                            </div>
                        </div>
                    `;
                }
            });
        });
        $('#summary-list').html(summaryHtml || '<div class="sim-row info-only"><p>Aucun élément sélectionné.</p></div>');
    }

    // --- Update Total ---
    function updateFinalTotal() {
        var totalHT = 0;
        $('#summary-list .input-calc').each(function() {
            var qty = parseFloat($(this).val()) || 0;
            var price = parseFloat($(this).data('price')) || 0;
            totalHT += (qty * price);
        });
        $('#final-total').data('raw-price', totalHT); 
        $('#final-total').text(formatMoney(totalHT));
    }

    function formatMoney(amount) {
        return amount.toLocaleString('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
        });
    }
    
    function saveToLocalStorage() {
        let simData = {
            needs: [],
            quantities: {},
            design: { status: "", url: "", date: "" },
            totalPrice: 0
        };

        $('input[name="needs"]:checked').each(function() {
            simData.needs.push($(this).val());
        });

        $('#step-2 .input-calc').each(function() {
            let $input = $(this);
            let label = $input.data('label');
            let qty = parseFloat($input.val()) || 0;
            if (qty > 0) { simData.quantities[label] = qty; }
        });

        simData.design.status = $('input[name="design-status"]:checked').val() || "non-renseigné";
        simData.design.url = $('#maquette-url').val();
        simData.design.date = $('#maquette-date-picker').val();
        simData.totalPrice = $('#final-total').data('raw-price') || 0;

        localStorage.setItem('hubSimData', JSON.stringify(simData));
    }
    
    function waitForFormAndPopulate(simData, retries = 10) {
        if (retries <= 0) {
            console.error("Simulateur: Impossible de trouver le formulaire HubSpot après 5 secondes.");
            return;
        }
        let $hubspotForm = $('form[data-form-id="a042c3b8-aebd-42a1-a607-5d070d368de6"]');
        if ($hubspotForm.length > 0) {
            populateHubSpotForm($hubspotForm, simData);
        } else {
            setTimeout(function() { waitForFormAndPopulate(simData, retries - 1); }, 500);
        }
    }
    
    function populateHubSpotForm($hubspotForm, simData) {
        if (!simData) {
            console.warn("Simulateur: Données non fournies.");
            return;
        }

        if (simData.needs && simData.needs.length > 0) {
            let interest = simData.needs[0];
            let interestValue = "";
            if (interest === 'site') interestValue = "Site internet";
            else if (interest === 'blog') interestValue = "Blog";
            else if (interest === 'templates') interestValue = "Landing Page"; 
            setHubSpotValue($hubspotForm.find('input[name="interet_offre"]'), interestValue);
        }

        if (simData.quantities) {
            setHubSpotValue($hubspotForm.find('input[name="nombre_templates_pages"]'), simData.quantities["Templates Site"] || 0);
            setHubSpotValue($hubspotForm.find('input[name="nombre_templates_landing_pages"]'), simData.quantities["Templates LP"] || 0);
            setHubSpotValue($hubspotForm.find('input[name="nombre_templates_blog_additionnels"]'), simData.quantities["Templates Blog Add."] || 0);
            let blogValue = simData.quantities["Architecture Blog de base"] > 0 ? "true" : "";
            setHubSpotValue($hubspotForm.find('input[name="blog"]'), blogValue);
        }
        
        if (simData.design && simData.design.status) {
            let designValue = "";
            if (simData.design.status === 'oui') designValue = "Oui";
            else if (simData.design.status === 'non') designValue = "Non";
            else if (simData.design.status === 'aide') designValue = "Pas de solutions";
            setHubSpotValue($hubspotForm.find('input[name="maquettes"]'), designValue);
        }
        
        setHubSpotValue($hubspotForm.find('input[name="url_figma"]'), simData.design.url || '');
        
        let dateStr = simData.design.date;
        if (dateStr) {
            try {
                let parts = dateStr.split('/');
                let isoDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                let $hiddenDate = $hubspotForm.find('input[name="date_livraison_maquette"]');
                let $visibleDate = $hubspotForm.find('input[id^="date_livraison_maquette-"]');
                setHubSpotValue($hiddenDate, isoDateStr);
                setHubSpotValue($visibleDate, isoDateStr); 
            } catch(e) {
                console.warn("Simulateur: Impossible de parser la date", dateStr, e);
            }
        }
        
        setHubSpotValue($hubspotForm.find('input[name="prix_estimation"]'), simData.totalPrice || 0);
    }

});