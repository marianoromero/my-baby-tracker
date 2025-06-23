<!-- src/routes/subject/[id]/+page.svelte -->
<script>
    import { page } from '$app/stores'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    import { subjects, actions } from '$lib/stores/family'
    import { supabase } from '$lib/supabase'
    import { user } from '$lib/stores/auth'
    import DeleteConfirmModal from '$lib/components/DeleteConfirmModal.svelte'
    
    let subject = null
    let subjectActions = []
    let registering = false
    let showAddAction = false
    let newActionName = ''
    
    // Variables para swipe-to-delete
    let swipeData = new Map() // Para trackear el estado de cada acción
    let showDeleteModal = false
    let actionToDelete = null
    let deleting = false
    
    // Variables para edición
    let editModalVisible = false
    let actionToEdit = null
    let editActionName = ''
    
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
    
    // Función para eliminar una acción
    async function deleteAction(actionId) {
        try {
            const { error } = await supabase
                .from('actions')
                .delete()
                .eq('id', actionId)
            
            if (error) {
                console.error('Error eliminando acción:', error)
                return { success: false, error: error.message }
            }
            
            // Remover la acción del store local
            const updatedActions = { ...$actions }
            if (updatedActions[subject.id]) {
                updatedActions[subject.id] = updatedActions[subject.id].filter(action => action.id !== actionId)
            }
            actions.set(updatedActions)
            
            return { success: true }
        } catch (err) {
            console.error('Error inesperado:', err)
            return { success: false, error: 'Error inesperado' }
        }
    }
    
    // Funciones para manejar swipe-to-delete
    function handleTouchStart(event, actionData) {
        const touch = event.touches[0]
        swipeData.set(actionData.id, {
            startX: touch.clientX,
            startY: touch.clientY,
            deltaX: 0,
            isSwiping: false,
            revealed: false
        })
    }
    
    function handleTouchMove(event, actionData) {
        const touch = event.touches[0]
        const data = swipeData.get(actionData.id)
        
        if (!data) return
        
        const deltaX = touch.clientX - data.startX
        const deltaY = touch.clientY - data.startY
        
        // Determinar si es un swipe horizontal
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            event.preventDefault()
            data.isSwiping = true
            data.deltaX = Math.min(0, deltaX) // Solo permitir swipe hacia la izquierda
            swipeData.set(actionData.id, data)
            swipeData = swipeData // Trigger reactivity
        }
    }
    
    function handleTouchEnd(event, actionData) {
        const data = swipeData.get(actionData.id)
        
        if (!data) return
        
        // Si se deslizó más de 120px, revelar los botones de acción
        if (data.deltaX < -120) {
            data.revealed = true
            data.deltaX = -120
        } else {
            data.revealed = false
            data.deltaX = 0
        }
        
        data.isSwiping = false
        swipeData.set(actionData.id, data)
        swipeData = swipeData // Trigger reactivity
    }
    
    function showEditModal(actionData) {
        console.log('Edit button clicked for action:', actionData.name)
        actionToEdit = actionData
        editActionName = actionData.name
        editModalVisible = true
        
        // Cerrar el swipe de la acción
        const data = swipeData.get(actionData.id)
        if (data) {
            data.revealed = false
            data.deltaX = 0
            swipeData.set(actionData.id, data)
            swipeData = swipeData
        }
    }

    function showDeleteConfirm(actionData) {
        console.log('Delete button clicked for action:', actionData.name)
        // Crear un objeto compatible con el modal de eventos
        actionToDelete = {
            id: actionData.id,
            action_name: actionData.name,
            subjects: subject,
            event_timestamp: new Date().toISOString() // Timestamp ficticio para el modal
        }
        showDeleteModal = true
        
        // Cerrar el swipe de la acción
        const data = swipeData.get(actionData.id)
        if (data) {
            data.revealed = false
            data.deltaX = 0
            swipeData.set(actionData.id, data)
            swipeData = swipeData
        }
    }
    
    async function confirmDelete(event) {
        if (!event.detail) return
        
        deleting = true
        const result = await deleteAction(event.detail.id)
        
        if (result.success) {
            // Limpiar datos del swipe
            swipeData.delete(event.detail.id)
            swipeData = swipeData
            
            // Mostrar notificación de éxito
            showNotification('✅ Acción eliminada correctamente')
        } else {
            showNotification('❌ Error al eliminar la acción')
        }
        
        deleting = false
        actionToDelete = null
    }
    
    function cancelDelete() {
        actionToDelete = null
    }

    async function updateAction() {
        if (!editActionName.trim() || !actionToEdit) return

        try {
            const { error } = await supabase
                .from('actions')
                .update({ name: editActionName.trim() })
                .eq('id', actionToEdit.id)

            if (error) throw error

            // Actualizar el store local
            const updatedActions = { ...$actions }
            if (updatedActions[subject.id]) {
                const actionIndex = updatedActions[subject.id].findIndex(a => a.id === actionToEdit.id)
                if (actionIndex !== -1) {
                    updatedActions[subject.id][actionIndex].name = editActionName.trim()
                }
            }
            actions.set(updatedActions)

            showNotification('✅ Acción actualizada')
            editModalVisible = false
            actionToEdit = null
            editActionName = ''
        } catch (error) {
            console.error('Error al actualizar acción:', error)
            showNotification('❌ Error al actualizar la acción')
        }
    }

    function cancelEdit() {
        editModalVisible = false
        actionToEdit = null
        editActionName = ''
    }
</script>

<div class="container">
    <header style="background-color: {subject?.color}">
        <button class="back-button" on:click={() => goto(`${base}/dashboard`)}>
            <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1>{subject?.name}</h1>
    </header>

    <main>
        <div class="actions-list">
            {#each subjectActions as action}
                <div class="action-wrapper" class:swiped={swipeData.get(action.id)?.revealed}>
                    <!-- Botones de acción (background) -->
                    <div class="actions-background">
                        <button 
                            class="action-background-btn edit-button"
                            on:click={() => showEditModal(action)}
                        >
                            <i class="fa-solid fa-pen"></i>
                            <span>Editar</span>
                        </button>
                        <button 
                            class="action-background-btn delete-button"
                            on:click={() => showDeleteConfirm(action)}
                        >
                            <i class="fa-solid fa-trash"></i>
                            <span>Eliminar</span>
                        </button>
                    </div>
                    
                    <!-- Botón de acción principal (foreground) -->
                    <button 
                        class="action-btn"
                        class:swiping={swipeData.get(action.id)?.isSwiping}
                        style="background-color: {subject?.color}33; color: {subject?.color}; transform: translateX({swipeData.get(action.id)?.deltaX || 0}px);"
                        on:click={() => registerEvent(action.name)}
                        on:touchstart={(e) => handleTouchStart(e, action)}
                        on:touchmove={(e) => handleTouchMove(e, action)}
                        on:touchend={(e) => handleTouchEnd(e, action)}
                        disabled={registering}
                    >
                        {action.name}
                    </button>
                </div>
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

<!-- Modal de edición -->
{#if editModalVisible}
    <div class="modal-overlay" on:click={cancelEdit}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h2>Editar Acción</h2>
            </div>
            <div class="modal-body">
                <input
                    type="text"
                    bind:value={editActionName}
                    placeholder="Nombre de la acción"
                    class="edit-input"
                />
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" on:click={cancelEdit}>
                    Cancelar
                </button>
                <button 
                    class="btn btn-primary" 
                    style="background-color: {subject?.color}"
                    on:click={updateAction}
                    disabled={!editActionName.trim()}
                >
                    Guardar
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal de confirmación de eliminación -->
<DeleteConfirmModal 
    bind:show={showDeleteModal}
    eventData={actionToDelete}
    on:confirm={confirmDelete}
    on:cancel={cancelDelete}
/>

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

    /* Swipe to delete */
    .action-wrapper {
        position: relative;
        overflow: hidden;
    }
    
    .actions-background {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 120px;
        display: flex;
        z-index: 1;
    }
    
    .action-background-btn {
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: var(--spacing-sm);
        font-size: 0.7rem;
        height: 100%;
        width: 60px;
        flex-shrink: 0;
        background: transparent;
        color: rgba(255, 255, 255, 0.4);
        transition: all 0.2s ease;
    }
    
    .action-background-btn i {
        font-size: 1.2rem;
        transition: all 0.2s ease;
    }
    
    .action-background-btn span {
        font-size: 0.65rem;
        opacity: 0.8;
    }

    /* Desktop: Botones sutiles y visibles */
    @media (min-width: 769px) {
        .action-background-btn:hover {
            color: rgba(255, 255, 255, 0.7);
            transform: scale(1.1);
        }
        
        .edit-button:hover {
            color: #4CAF50;
        }
        
        .delete-button:hover {
            color: #ff6b6b;
        }
        
        .action-background-btn:active {
            transform: scale(0.95);
        }
    }

    /* Mobile: Botones ocultos, solo iconos al deslizar */
    @media (max-width: 768px) {
        .actions-background {
            background: transparent;
        }
        
        .action-background-btn {
            background: transparent;
            color: transparent;
        }
        
        .action-background-btn i {
            font-size: 1.5rem;
            color: transparent;
            transition: color 0.3s ease;
        }
        
        .action-background-btn span {
            display: none;
        }
        
        /* Mostrar iconos cuando el botón principal está deslizado */
        .action-wrapper.swiped .edit-button i {
            color: #4CAF50;
        }
        
        .action-wrapper.swiped .delete-button i {
            color: #ff6b6b;
        }
        
        .action-background-btn:active {
            opacity: 0.6;
        }
    }

    .action-btn {
        padding: var(--spacing-lg);
        border: none;
        cursor: pointer;
        transition: transform 0.3s ease, opacity 0.2s ease;
        font-size: 1rem;
        text-align: left;
        border-radius: 0;
        position: relative;
        z-index: 2;
        width: 100%;
        touch-action: pan-y; /* Permitir scroll vertical */
        background: var(--white); /* Asegurar que tenga fondo */
    }
    
    .action-btn.swiping {
        transition: none; /* Deshabilitar transición durante el swipe */
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

    /* Modal de edición */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--spacing-md);
    }

    .modal-content {
        background: var(--white);
        border-radius: var(--radius-md);
        max-width: 400px;
        width: 100%;
        box-shadow: var(--shadow-lg);
    }

    .modal-header {
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--light);
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--dark);
    }

    .modal-body {
        padding: var(--spacing-lg);
    }

    .edit-input {
        width: 100%;
        padding: var(--spacing-md);
        border: 1px solid var(--gray);
        border-radius: var(--radius-sm);
        font-size: 1rem;
        box-sizing: border-box;
    }

    .edit-input:focus {
        outline: none;
        border-color: var(--primary);
    }

    .modal-footer {
        padding: var(--spacing-lg);
        border-top: 1px solid var(--light);
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
    }

    .modal-footer .btn {
        padding: var(--spacing-sm) var(--spacing-lg);
        border: none;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 1rem;
    }

    .btn-primary {
        background-color: var(--primary);
        color: var(--white);
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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