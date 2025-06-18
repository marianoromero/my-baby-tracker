<!-- src/routes/subject/[id]/+page.svelte -->
<script>
    import { page } from '$app/stores'
    import { goto } from '$app/navigation'
    import { subjects, actions } from '$lib/stores/family'
    import { supabase } from '$lib/supabase'
    import { user } from '$lib/stores/auth'
    
    let subject = null
    let subjectActions = []
    let registering = false
    let showAddAction = false
    let newActionName = ''
    
    // Cargar datos del sujeto y sus acciones
    $: {
        const subjectId = $page.params.id
        subject = $subjects.find(s => s.id === subjectId)
        if (subject && $actions[subjectId]) {
            // Obtener las 10 acciones más recientes
            const recentActions = $actions[subjectId]
                .sort((a, b) => b.last_used - a.last_used)
                .slice(0, 10)
            
            // Obtener el resto de acciones ordenadas alfabéticamente
            const otherActions = $actions[subjectId]
                .filter(a => !recentActions.includes(a))
                .sort((a, b) => a.name.localeCompare(b.name))
            
            subjectActions = [...recentActions, ...otherActions]
        }
    }
    
    // Registrar un evento
    async function registerEvent(actionName) {
        registering = true
        
        const { error } = await supabase
            .from('events')
            .insert({
                subject_id: subject.id,
                user_id: $user.id,
                action_name: actionName,
                event_timestamp: new Date().toISOString()
            })
        
        if (error) {
            console.error('Error al registrar evento:', error)
            alert('Error al registrar el evento')
        } else {
            showNotification(`✅ ${actionName} registrado`)
        }
        
        registering = false
    }
    
    // Añadir nueva acción
    async function addNewAction() {
        if (!newActionName.trim()) return
        
        try {
            // Primero insertamos la acción
            const { data: newAction, error: insertError } = await supabase
                .from('actions')
                .insert({
                    subject_id: subject.id,
                    name: newActionName.trim()
                })
                .select()
                .single()
            
            if (insertError) throw insertError

            // Actualizamos el store de acciones
            const updatedActions = { ...$actions }
            if (!updatedActions[subject.id]) {
                updatedActions[subject.id] = []
            }
            updatedActions[subject.id].push({
                ...newAction,
                last_used: new Date().toISOString()
            })
            actions.set(updatedActions)

            showNotification('✅ Acción añadida')
            newActionName = ''
            showAddAction = false
        } catch (error) {
            console.error('Error al añadir acción:', error)
            showNotification('❌ Error al añadir la acción')
        }
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
</script>

<div class="container">
    <header style="background-color: {subject?.color}">
        <button class="back-button" on:click={() => goto('/dashboard')}>
            <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1>{subject?.name}</h1>
    </header>

    <main>
        <div class="actions-list">
            {#each subjectActions as action}
                <button 
                    class="action-btn"
                    on:click={() => registerEvent(action.name)}
                    disabled={registering}
                    style="background-color: {subject?.color}33; color: {subject?.color}"
                >
                    {action.name}
                </button>
            {/each}

            {#if showAddAction}
                <div class="add-action-form">
                    <input
                        type="text"
                        bind:value={newActionName}
                        placeholder="Nombre de la nueva acción"
                        class="action-input"
                    />
                    <div class="add-action-buttons">
                        <button 
                            class="btn btn-secondary"
                            on:click={() => showAddAction = false}
                        >
                            Cancelar
                        </button>
                        <button 
                            class="btn btn-primary"
                            on:click={addNewAction}
                            disabled={!newActionName.trim()}
                            style="background-color: {subject?.color}"
                        >
                            Añadir
                        </button>
                    </div>
                </div>
            {:else}
                <button 
                    class="add-action-btn"
                    on:click={() => showAddAction = true}
                    style="border-color: {subject?.color}; color: {subject?.color}"
                >
                    <i class="fa-solid fa-plus"></i>
                    Añadir acción
                </button>
            {/if}
        </div>
    </main>
</div>

<style>
    .container {
        min-height: 100vh;
        background-color: var(--gray-light);
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    header {
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
        padding: var(--spacing-md);
        flex: 1;
    }

    .actions-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .action-btn {
        padding: var(--spacing-lg);
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1rem;
        text-align: left;
        border-radius: 0;
    }

    .action-btn:hover:not(:disabled) {
        opacity: 0.3 !important;
    }

    .action-btn:disabled {
        opacity: 0.1 !important;
        cursor: not-allowed;
    }

    .add-action-btn {
        padding: var(--spacing-lg);
        background: var(--white);
        border: 2px dashed;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
        border-radius: 0;
    }

    .add-action-btn:hover {
        background: var(--gray-light);
        opacity: 0.8;
    }

    .add-action-form {
        background: var(--white);
        padding: var(--spacing-md);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .action-input {
        padding: var(--spacing-md);
        border: 1px solid var(--gray);
        font-size: 1rem;
        width: 100%;
        border-radius: 0;
    }

    .action-input:focus {
        outline: none;
        border-color: var(--primary);
    }

    .add-action-buttons {
        display: flex;
        gap: var(--spacing-sm);
    }

    .add-action-buttons .btn {
        flex: 1;
        padding: var(--spacing-md);
        border-radius: 0;
    }

    .btn-secondary {
        background-color: var(--gray);
        color: var(--white);
    }

    .btn-secondary:hover {
        background-color: var(--gray-dark);
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

    /* Responsive */
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