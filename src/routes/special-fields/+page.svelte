<!-- src/routes/special-fields/+page.svelte -->
<script>
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    import { user } from '$lib/stores/auth'
    import { family, subjects } from '$lib/stores/family'
    import { supabase } from '$lib/supabase'
    
    let specialFields = [
        {
            id: 'bottle_feeding',
            name: 'Biberón',
            icon: 'fa-baby-carriage',
            description: 'Captura la cantidad de ml',
            type: 'number',
            inputOptions: {
                presets: [30, 60, 90, 120, 150, 180],
                defaultValue: 120,
                unit: 'ml',
                min: 1,
                max: 500
            }
        },
        {
            id: 'weight_measurement',
            name: 'Peso',
            icon: 'fa-weight-scale',
            description: 'Registro de peso en kg',
            type: 'range',
            inputOptions: {
                kgMin: 1,
                kgMax: 15,
                gramsMin: 0,
                gramsMax: 999,
                gramsStep: 5
            }
        },
        {
            id: 'height_measurement',
            name: 'Estatura',
            icon: 'fa-ruler-vertical',
            description: 'Registro de estatura en metros',
            type: 'range',
            inputOptions: {
                metersMin: 0,
                metersMax: 2,
                centimetersMin: 0,
                centimetersMax: 99
            }
        },
        {
            id: 'formula_feeding',
            name: 'Leche Fórmula',
            icon: 'fa-baby',
            description: 'Marca, tipo y etapa de la fórmula',
            type: 'text',
            inputOptions: {
                placeholder: 'Ej: Almiron Profutura 2',
                suggestions: ['Almiron Profutura 2', 'NAN 1', 'Similac Advance', 'Enfamil Premium']
            }
        }
    ]
    
    let configurations = {}
    let loading = true
    let saving = false
    
    // Cargar configuraciones existentes
    async function loadConfigurations() {
        if (!$family) return
        
        try {
            const { data, error } = await supabase
                .from('special_action_configs')
                .select('*')
                .eq('family_id', $family.id)
            
            if (error) throw error
            
            // Organizar configuraciones por tipo especial
            const configsByType = {}
            if (data) {
                data.forEach(config => {
                    if (!configsByType[config.special_type]) {
                        configsByType[config.special_type] = []
                    }
                    configsByType[config.special_type].push(config)
                })
            }
            
            // Inicializar configuraciones para cada campo especial
            specialFields.forEach(field => {
                configurations[field.id] = {
                    enabled: configsByType[field.id] ? true : false,
                    subjects: configsByType[field.id] || [],
                    subjectIds: configsByType[field.id] ? configsByType[field.id].map(c => c.action_id) : [],
                    defaultOptions: field.inputOptions
                }
            })
            
            loading = false
        } catch (error) {
            console.error('Error cargando configuraciones:', error)
            loading = false
        }
    }
    
    // Guardar configuración de un campo especial
    async function saveFieldConfiguration(fieldId) {
        if (!$family || saving) return
        
        saving = true
        const config = configurations[fieldId]
        
        try {
            // Primero eliminar configuraciones existentes para este tipo
            await supabase
                .from('special_action_configs')
                .delete()
                .eq('family_id', $family.id)
                .eq('special_type', fieldId)
            
            // Si está habilitado y hay sujetos seleccionados, crear nuevas configuraciones
            if (config.enabled && config.subjectIds.length > 0) {
                const configsToInsert = []
                
                // Para cada sujeto seleccionado, buscar sus acciones relevantes
                for (const subjectId of config.subjectIds) {
                    const field = specialFields.find(f => f.id === fieldId)
                    
                    // Buscar acciones que coincidan con este tipo especial
                    const { data: actions, error: actionsError } = await supabase
                        .from('actions')
                        .select('id, name')
                        .eq('subject_id', subjectId)
                    
                    if (actionsError) throw actionsError
                    
                    // Filtrar acciones que coincidan con las palabras clave del campo especial
                    const relevantActions = actions.filter(action => {
                        const actionName = action.name.toLowerCase()
                        switch (fieldId) {
                            case 'bottle_feeding':
                                return ['biber', 'bibi', 'botella', 'milk', 'leche', 'formula'].some(keyword => 
                                    actionName.includes(keyword) && !actionName.includes('fórmula'))
                            case 'weight_measurement':
                                return ['peso', 'weight', 'kg', 'kilo', 'pesaje', 'pesa'].some(keyword => 
                                    actionName.includes(keyword))
                            case 'height_measurement':
                                return ['estatura', 'altura', 'height', 'tall', 'talla', 'medir', 'medida'].some(keyword => 
                                    actionName.includes(keyword))
                            case 'formula_feeding':
                                return ['leche fórmula', 'formula', 'fórmula'].some(keyword => 
                                    actionName.includes(keyword.toLowerCase()))
                            default:
                                return false
                        }
                    })
                    
                    // Crear configuraciones para cada acción relevante
                    relevantActions.forEach(action => {
                        configsToInsert.push({
                            family_id: $family.id,
                            action_id: action.id,
                            special_type: fieldId,
                            config_data: config.defaultOptions
                        })
                    })
                }
                
                if (configsToInsert.length > 0) {
                    const { error: insertError } = await supabase
                        .from('special_action_configs')
                        .insert(configsToInsert)
                    
                    if (insertError) throw insertError
                }
            }
            
            showNotification('✅ Configuración guardada')
            await loadConfigurations() // Recargar configuraciones
            
        } catch (error) {
            console.error('Error guardando configuración:', error)
            showNotification('❌ Error al guardar la configuración')
        } finally {
            saving = false
        }
    }
    
    // Alternar selección de sujeto
    function toggleSubjectForField(fieldId, subjectId) {
        const config = configurations[fieldId]
        const index = config.subjectIds.indexOf(subjectId)
        
        if (index === -1) {
            config.subjectIds.push(subjectId)
        } else {
            config.subjectIds.splice(index, 1)
        }
        
        configurations[fieldId] = { ...config }
    }
    
    // Mostrar notificación temporal
    function showNotification(message) {
        const notification = document.createElement('div')
        notification.className = 'notification'
        notification.textContent = message
        document.body.appendChild(notification)
        
        setTimeout(() => notification.classList.add('show'), 10)
        
        setTimeout(() => {
            notification.classList.remove('show')
            setTimeout(() => notification.remove(), 300)
        }, 3000)
    }
    
    onMount(() => {
        loadConfigurations()
    })
    
    $: if ($family && $subjects) {
        loadConfigurations()
    }
</script>

<div class="container">
    <header>
        <button class="back-button" on:click={() => goto(`${base}/dashboard`)}>
            <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Campos Especiales</h1>
    </header>

    <main>
        {#if loading}
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Cargando configuración...</p>
            </div>
        {:else}
            <div class="description">
                <p>Configura qué campos especiales están disponibles para cada miembro de la familia y personaliza sus opciones por defecto.</p>
            </div>

            <div class="fields-list">
                {#each specialFields as field}
                    <div class="field-card">
                        <div class="field-header">
                            <div class="field-info">
                                <i class="fa-solid {field.icon}"></i>
                                <div>
                                    <h3>{field.name}</h3>
                                    <p class="field-description">{field.description}</p>
                                </div>
                            </div>
                            <label class="toggle">
                                <input
                                    type="checkbox"
                                    bind:checked={configurations[field.id].enabled}
                                    on:change={() => saveFieldConfiguration(field.id)}
                                    disabled={saving}
                                />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>

                        {#if configurations[field.id].enabled}
                            <div class="field-content">
                                <div class="subjects-selection">
                                    <h4>Disponible para:</h4>
                                    <div class="subjects-grid">
                                        {#each $subjects as subject}
                                            <label class="subject-option">
                                                <input
                                                    type="checkbox"
                                                    checked={configurations[field.id].subjectIds.includes(subject.id)}
                                                    on:change={() => {
                                                        toggleSubjectForField(field.id, subject.id)
                                                        saveFieldConfiguration(field.id)
                                                    }}
                                                    disabled={saving}
                                                />
                                                <div class="subject-card">
                                                    <i class="fa-solid {subject.icon}"></i>
                                                    <span>{subject.name}</span>
                                                </div>
                                            </label>
                                        {/each}
                                    </div>
                                </div>

                                <div class="field-options">
                                    <h4>Opciones por defecto:</h4>
                                    
                                    {#if field.type === 'number'}
                                        <div class="number-options">
                                            <div class="presets">
                                                <label>Cantidades predefinidas:</label>
                                                <div class="preset-values">
                                                    {#each field.inputOptions.presets as preset}
                                                        <span class="preset-badge">{preset}{field.inputOptions.unit}</span>
                                                    {/each}
                                                </div>
                                            </div>
                                            <div class="default-value">
                                                <label>Valor por defecto: {field.inputOptions.defaultValue}{field.inputOptions.unit}</label>
                                            </div>
                                        </div>
                                    {:else if field.type === 'text'}
                                        <div class="text-options">
                                            <div class="suggestions">
                                                <label>Sugerencias:</label>
                                                <div class="suggestion-values">
                                                    {#each field.inputOptions.suggestions as suggestion}
                                                        <span class="suggestion-badge">{suggestion}</span>
                                                    {/each}
                                                </div>
                                            </div>
                                        </div>
                                    {:else if field.type === 'range'}
                                        <div class="range-options">
                                            {#if field.id === 'weight_measurement'}
                                                <div class="range-info">
                                                    <span>Peso: {field.inputOptions.kgMin}-{field.inputOptions.kgMax} kg</span>
                                                    <span>Gramos: {field.inputOptions.gramsMin}-{field.inputOptions.gramsMax} g (paso: {field.inputOptions.gramsStep}g)</span>
                                                </div>
                                            {:else if field.id === 'height_measurement'}
                                                <div class="range-info">
                                                    <span>Metros: {field.inputOptions.metersMin}-{field.inputOptions.metersMax} m</span>
                                                    <span>Centímetros: {field.inputOptions.centimetersMin}-{field.inputOptions.centimetersMax} cm</span>
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </main>
</div>

<style>
    .container {
        min-height: 100vh;
        background-color: var(--gray-light);
        display: flex;
        flex-direction: column;
    }

    header {
        background-color: var(--primary);
        color: var(--white);
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        box-shadow: var(--shadow-md);
    }

    .back-button {
        background: none;
        border: none;
        color: var(--white);
        font-size: 1.25rem;
        cursor: pointer;
        padding: var(--spacing-sm);
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
    }

    main {
        flex: 1;
        padding: var(--spacing-md);
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-md);
        height: 200px;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--light);
        border-top: 4px solid var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .description {
        background: var(--white);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-lg);
        border-left: 4px solid var(--primary);
    }

    .description p {
        margin: 0;
        color: var(--gray-dark);
        line-height: 1.5;
    }

    .fields-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .field-card {
        background: var(--white);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
    }

    .field-header {
        padding: var(--spacing-lg);
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--light);
    }

    .field-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .field-info i {
        font-size: 1.5rem;
        color: var(--primary);
        width: 30px;
        text-align: center;
    }

    .field-info h3 {
        margin: 0;
        font-size: 1.2rem;
        color: var(--dark);
    }

    .field-description {
        margin: 0;
        font-size: 0.9rem;
        color: var(--gray-dark);
    }

    .toggle {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
    }

    .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--gray);
        transition: 0.3s;
        border-radius: 24px;
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
    }

    .toggle input:checked + .toggle-slider {
        background-color: var(--primary);
    }

    .toggle input:checked + .toggle-slider:before {
        transform: translateX(26px);
    }

    .field-content {
        padding: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
    }

    .subjects-selection h4,
    .field-options h4 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: 1rem;
        color: var(--dark);
    }

    .subjects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--spacing-sm);
    }

    .subject-option {
        display: flex;
        cursor: pointer;
    }

    .subject-option input {
        display: none;
    }

    .subject-card {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        border: 2px solid var(--light);
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
        flex: 1;
    }

    .subject-option input:checked + .subject-card {
        border-color: var(--primary);
        background-color: rgba(27, 127, 121, 0.1);
    }

    .subject-card:hover {
        border-color: var(--primary);
    }

    .subject-card i {
        color: var(--primary);
        font-size: 1.2rem;
    }

    .number-options,
    .text-options,
    .range-options {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .presets,
    .suggestions,
    .default-value {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .presets label,
    .suggestions label,
    .default-value label {
        font-weight: 500;
        color: var(--dark);
        font-size: 0.9rem;
    }

    .preset-values,
    .suggestion-values {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
    }

    .preset-badge,
    .suggestion-badge {
        background: var(--background);
        color: var(--primary);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-weight: 500;
    }

    .range-info {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .range-info span {
        background: var(--background);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        color: var(--gray-dark);
    }

    /* Responsive */
    @media (max-width: 768px) {
        .field-header {
            flex-direction: column;
            gap: var(--spacing-md);
            align-items: flex-start;
        }

        .subjects-grid {
            grid-template-columns: 1fr;
        }

        .preset-values,
        .suggestion-values {
            flex-direction: column;
        }
    }

    /* Notificaciones */
    :global(.notification) {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary);
        color: var(--white);
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1000;
    }

    :global(.notification.show) {
        transform: translateX(0);
    }

    @media (max-width: 640px) {
        :global(.notification) {
            right: var(--spacing-md);
            left: var(--spacing-md);
            transform: translateY(-100px);
        }
        
        :global(.notification.show) {
            transform: translateY(0);
        }
    }
</style>