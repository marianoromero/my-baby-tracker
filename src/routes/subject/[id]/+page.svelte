<!-- src/routes/subject/[id]/+page.svelte -->
<script>
    import { page } from '$app/stores'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    import { subjects, actions } from '$lib/stores/family'
    import { supabase } from '$lib/supabase'
    import { user } from '$lib/stores/auth'
    
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

    // Variables para drag and drop
    let draggedItem = null
    let draggedOverItem = null
    let isDragging = false
    let dragStartY = 0

    // Variables para modal de biberón
    let showBottleModal = false
    let selectedBottleAction = null
    let bottleAmount = 120 // Cantidad por defecto
    let customAmount = ''
    const bottleAmounts = [30, 60, 90, 120, 150, 180]

    // Variables para modal de peso
    let showWeightModal = false
    let selectedWeightAction = null
    let weightKg = 3 // Kilogramos por defecto
    let weightGrams = 0 // Gramos por defecto (0-999)
    let lastWeight = null // Último peso registrado

    // Variables para modal de estatura
    let showHeightModal = false
    let selectedHeightAction = null
    let heightMeters = 0 // Metros por defecto
    let heightCentimeters = 50 // Centímetros por defecto (0-99)
    let lastHeight = null // Última estatura registrada
    
    // Cargar datos del sujeto y sus acciones
    $: {
        const subjectId = $page.params.id
        subject = $subjects.find(s => s.id === subjectId)
        if (subject && $actions[subjectId]) {
            // Ordenar por sort_order primero, luego por más recientes, luego alfabéticamente
            subjectActions = $actions[subjectId]
                .slice()
                .sort((a, b) => {
                    // Si ambas tienen sort_order, ordenar por eso
                    if (a.sort_order !== undefined && b.sort_order !== undefined) {
                        return a.sort_order - b.sort_order
                    }
                    // Si solo una tiene sort_order, esa va primero
                    if (a.sort_order !== undefined) return -1
                    if (b.sort_order !== undefined) return 1
                    // Si ninguna tiene sort_order, ordenar por fecha de último uso, luego alfabéticamente
                    if (a.last_used && b.last_used) {
                        return b.last_used - a.last_used
                    }
                    return a.name.localeCompare(b.name)
                })
        }
    }
    
    // Registrar un evento
    async function registerEvent(actionName) {
        // Detectar si es una acción especial (biberón)
        if (isBottleAction(actionName)) {
            selectedBottleAction = actionName
            showBottleModal = true
            return
        }

        // Detectar si es una acción especial (peso)
        if (isWeightAction(actionName)) {
            selectedWeightAction = actionName
            await loadLastWeight() // Cargar último peso registrado
            showWeightModal = true
            return
        }

        // Detectar si es una acción especial (estatura)
        if (isHeightAction(actionName)) {
            selectedHeightAction = actionName
            await loadLastHeight() // Cargar última estatura registrada
            showHeightModal = true
            return
        }

        await executeEventRegistration(actionName)
    }

    // Ejecutar el registro real del evento
    async function executeEventRegistration(actionName, additionalData = null) {
        registering = true
        
        // Construir el nombre final según el tipo de dato adicional
        let finalActionName = actionName
        let successMessage = `✅ ${actionName} registrado`
        
        if (additionalData) {
            if (additionalData.type === 'bottle_feeding') {
                finalActionName = `${actionName} (${additionalData.amount}ml)`
                successMessage = `✅ ${actionName} registrado (${additionalData.amount}ml)`
            } else if (additionalData.type === 'weight_measurement') {
                finalActionName = `${actionName} (${additionalData.formatted})`
                successMessage = `✅ ${actionName} registrado (${additionalData.formatted})`
            } else if (additionalData.type === 'height_measurement') {
                finalActionName = `${actionName} (${additionalData.formatted})`
                successMessage = `✅ ${actionName} registrado (${additionalData.formatted})`
            }
        }
        
        const eventData = {
            subject_id: subject.id,
            user_id: $user.id,
            action_name: finalActionName,
            event_timestamp: new Date().toISOString()
        }
        
        const { error } = await supabase
            .from('events')
            .insert(eventData)
        
        if (error) {
            console.error('Error al registrar evento:', error)
            alert('Error al registrar el evento')
        } else {
            showNotification(successMessage)
        }
        
        registering = false
    }

    // Detectar si una acción es de tipo biberón
    function isBottleAction(actionName) {
        const bottleKeywords = ['biber', 'bibi', 'botella', 'milk', 'leche', 'formula']
        return bottleKeywords.some(keyword => 
            actionName.toLowerCase().includes(keyword)
        )
    }

    // Detectar si una acción es de tipo peso
    function isWeightAction(actionName) {
        const weightKeywords = ['peso', 'weight', 'kg', 'kilo', 'pesaje', 'pesa']
        return weightKeywords.some(keyword => 
            actionName.toLowerCase().includes(keyword)
        )
    }

    // Detectar si una acción es de tipo estatura
    function isHeightAction(actionName) {
        const heightKeywords = ['estatura', 'altura', 'height', 'tall', 'talla', 'medir', 'medida']
        return heightKeywords.some(keyword => 
            actionName.toLowerCase().includes(keyword)
        )
    }
    
    // Añadir nueva acción
    async function addNewAction() {
        if (!newActionName.trim()) return
        
        try {
            // Obtener el próximo sort_order (mayor que el existente)
            const maxSortOrder = Math.max(...subjectActions.map(a => a.sort_order || 0), -1)
            
            // Primero insertamos la acción
            const { data: newAction, error: insertError } = await supabase
                .from('actions')
                .insert({
                    subject_id: subject.id,
                    name: newActionName.trim(),
                    sort_order: maxSortOrder + 1
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
    function handleSwipeStart(event, actionData) {
        const touch = event.touches[0]
        swipeData.set(actionData.id, {
            startX: touch.clientX,
            startY: touch.clientY,
            deltaX: 0,
            isSwiping: false,
            revealed: false
        })
    }
    
    function handleSwipeMove(event, actionData) {
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
    
    function handleSwipeEnd(event, actionData) {
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
        actionToDelete = actionData
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
    
    async function confirmDelete() {
        if (!actionToDelete) return
        
        deleting = true
        const result = await deleteAction(actionToDelete.id)
        
        if (result.success) {
            // Limpiar datos del swipe
            swipeData.delete(actionToDelete.id)
            swipeData = swipeData
            
            // Mostrar notificación de éxito
            showNotification('✅ Acción eliminada correctamente')
        } else {
            showNotification('❌ Error al eliminar la acción')
        }
        
        deleting = false
        showDeleteModal = false
        actionToDelete = null
    }
    
    function cancelDelete() {
        showDeleteModal = false
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

    // Funciones para modal de biberón
    function confirmBottleAmount() {
        const amount = customAmount ? parseInt(customAmount) : bottleAmount
        if (amount && amount > 0) {
            executeEventRegistration(selectedBottleAction, { 
                amount: amount,
                type: 'bottle_feeding'
            })
            closeBottleModal()
        }
    }

    function closeBottleModal() {
        showBottleModal = false
        selectedBottleAction = null
        bottleAmount = 120
        customAmount = ''
    }

    function selectBottleAmount(amount) {
        bottleAmount = amount
        customAmount = ''
    }

    // Funciones para modal de peso
    async function loadLastWeight() {
        try {
            const { data: lastWeightEvent, error } = await supabase
                .from('events')
                .select('action_name')
                .eq('subject_id', subject.id)
                .like('action_name', '%peso%')
                .order('event_timestamp', { ascending: false })
                .limit(1)
                .single()

            if (!error && lastWeightEvent) {
                // Extraer peso del formato "Peso (3.5kg)"
                const match = lastWeightEvent.action_name.match(/\((\d+)\.(\d+)kg\)/)
                if (match) {
                    weightKg = parseInt(match[1])
                    weightGrams = parseInt(match[2])
                    lastWeight = `${weightKg}.${match[2].padStart(3, '0')}kg`
                }
            }
        } catch (error) {
            console.error('Error cargando último peso:', error)
        }
    }

    function confirmWeightAmount() {
        const totalWeight = weightKg + (weightGrams / 1000)
        const formattedWeight = `${weightKg}.${weightGrams.toString().padStart(3, '0')}kg`
        
        executeEventRegistration(selectedWeightAction, { 
            weight: totalWeight,
            formatted: formattedWeight,
            type: 'weight_measurement'
        })
        closeWeightModal()
    }

    function closeWeightModal() {
        showWeightModal = false
        selectedWeightAction = null
        // No resetear los valores para mantener el último peso
    }

    // Funciones para modal de estatura
    async function loadLastHeight() {
        try {
            const { data: lastHeightEvent, error } = await supabase
                .from('events')
                .select('action_name')
                .eq('subject_id', subject.id)
                .or('action_name.ilike.%estatura%,action_name.ilike.%altura%')
                .order('event_timestamp', { ascending: false })
                .limit(1)
                .single()

            if (!error && lastHeightEvent) {
                // Extraer estatura del formato "Estatura (0.65m)"
                const match = lastHeightEvent.action_name.match(/\((\d+)\.(\d+)m\)/)
                if (match) {
                    heightMeters = parseInt(match[1])
                    heightCentimeters = parseInt(match[2])
                    lastHeight = `${heightMeters}.${match[2].padStart(2, '0')}m`
                }
            }
        } catch (error) {
            console.error('Error cargando última estatura:', error)
        }
    }

    function confirmHeightAmount() {
        const totalHeight = heightMeters + (heightCentimeters / 100)
        const formattedHeight = `${heightMeters}.${heightCentimeters.toString().padStart(2, '0')}m`
        
        executeEventRegistration(selectedHeightAction, { 
            height: totalHeight,
            formatted: formattedHeight,
            type: 'height_measurement'
        })
        closeHeightModal()
    }

    function closeHeightModal() {
        showHeightModal = false
        selectedHeightAction = null
        // No resetear los valores para mantener la última estatura
    }

    // Funciones para drag and drop
    function handleDragStart(event, action) {
        if (event.type === 'touchstart') {
            // Para mobile: guardar posición inicial del touch
            const touch = event.touches[0]
            dragStartY = touch.clientY
            draggedItem = action
            
            // Pequeño delay para distinguir entre tap y drag
            setTimeout(() => {
                if (draggedItem === action) {
                    isDragging = true
                    event.target.classList.add('dragging')
                }
            }, 150)
        } else {
            // Para desktop: drag estándar
            draggedItem = action
            isDragging = true
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/html', event.target.outerHTML)
            event.target.classList.add('dragging')
        }
    }

    function handleDragOver(event, action) {
        if (!isDragging || !draggedItem) return
        
        event.preventDefault()
        
        if (event.type === 'touchmove') {
            const touch = event.touches[0]
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
            const actionElement = elementBelow?.closest('.action-wrapper')
            
            if (actionElement) {
                const actionId = actionElement.dataset.actionId
                const targetAction = subjectActions.find(a => a.id === actionId)
                if (targetAction && targetAction.id !== draggedItem.id) {
                    draggedOverItem = targetAction
                }
            }
        } else {
            if (action.id !== draggedItem.id) {
                draggedOverItem = action
            }
        }
    }

    function handleDragEnd(event) {
        if (!isDragging || !draggedItem) return
        
        event.target.classList.remove('dragging')
        
        if (draggedOverItem && draggedItem.id !== draggedOverItem.id) {
            reorderActions(draggedItem, draggedOverItem)
        }
        
        // Reset drag state
        draggedItem = null
        draggedOverItem = null
        isDragging = false
        dragStartY = 0
    }

    function handleTouchMove(event, action) {
        if (!draggedItem) return
        
        const touch = event.touches[0]
        const currentY = touch.clientY
        
        // Si se movió suficiente verticalmente, considerarlo un drag
        if (Math.abs(currentY - dragStartY) > 10) {
            isDragging = true
            event.target.classList.add('dragging')
            handleDragOver(event, action)
        }
    }

    function handleTouchEnd(event, action) {
        if (isDragging) {
            handleDragEnd(event)
        } else {
            // Si no era un drag, ejecutar la acción normal
            draggedItem = null
        }
    }

    // Reordenar acciones y actualizar base de datos
    async function reorderActions(draggedAction, targetAction) {
        try {
            // Encontrar índices actuales
            const draggedIndex = subjectActions.findIndex(a => a.id === draggedAction.id)
            const targetIndex = subjectActions.findIndex(a => a.id === targetAction.id)
            
            if (draggedIndex === -1 || targetIndex === -1) return
            
            // Crear nueva lista reordenada
            const newOrder = [...subjectActions]
            newOrder.splice(draggedIndex, 1)
            newOrder.splice(targetIndex, 0, draggedAction)
            
            // Asignar nuevos sort_order
            const updatePromises = newOrder.map((action, index) => {
                return supabase
                    .from('actions')
                    .update({ sort_order: index })
                    .eq('id', action.id)
            })
            
            // Ejecutar todas las actualizaciones
            await Promise.all(updatePromises)
            
            // Actualizar el store local
            const updatedActions = { ...$actions }
            if (updatedActions[subject.id]) {
                updatedActions[subject.id] = newOrder.map((action, index) => ({
                    ...action,
                    sort_order: index
                }))
            }
            actions.set(updatedActions)
            
            showNotification('✅ Orden actualizado')
            
        } catch (error) {
            console.error('Error al reordenar acciones:', error)
            showNotification('❌ Error al actualizar orden')
        }
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
        <div class="actions-list" role="list">
            {#each subjectActions as action, index}
                <div 
                    class="action-wrapper" 
                    class:swiped={swipeData.get(action.id)?.revealed}
                    class:drag-over={draggedOverItem?.id === action.id}
                    class:dragging={draggedItem?.id === action.id}
                    data-action-id={action.id}
                    draggable="true"
                    role="listitem"
                    on:dragstart={(e) => handleDragStart(e, action)}
                    on:dragover={(e) => handleDragOver(e, action)}
                    on:dragend={handleDragEnd}
                    on:touchstart={(e) => handleDragStart(e, action)}
                    on:touchmove={(e) => handleTouchMove(e, action)}
                    on:touchend={(e) => handleTouchEnd(e, action)}
                >
                    <!-- Indicador de drag -->
                    <div class="drag-handle">
                        <i class="fa-solid fa-grip-vertical"></i>
                    </div>
                    
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
                        class:dragging={draggedItem?.id === action.id}
                        style="background-color: {subject?.color}33; color: {subject?.color}; transform: translateX({swipeData.get(action.id)?.deltaX || 0}px);"
                        on:click={() => !isDragging && registerEvent(action.name)}
                        disabled={registering || isDragging}
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

<!-- Modal de confirmación de eliminación de acción -->
{#if showDeleteModal && actionToDelete}
    <div class="modal-overlay" on:click={cancelDelete}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <i class="fa-solid fa-exclamation-triangle warning-icon"></i>
                <h2>Eliminar Acción</h2>
            </div>
            <div class="modal-body">
                <p>¿Estás seguro de que quieres eliminar la acción <strong>"{actionToDelete.name}"</strong>?</p>
                <p class="warning-text">Esta acción se eliminará permanentemente de la lista de {subject?.name} y no se podrá deshacer.</p>
            </div>
            <div class="modal-footer">
                <button 
                    class="btn btn-secondary" 
                    on:click={cancelDelete}
                    disabled={deleting}
                >
                    Cancelar
                </button>
                <button 
                    class="btn btn-danger" 
                    on:click={confirmDelete}
                    disabled={deleting}
                >
                    {#if deleting}
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Eliminando...
                    {:else}
                        <i class="fa-solid fa-trash"></i>
                        Eliminar Acción
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal de cantidad de biberón -->
{#if showBottleModal}
    <div class="modal-overlay" on:click={closeBottleModal}>
        <div class="modal-content bottle-modal" on:click|stopPropagation>
            <div class="modal-header">
                <i class="fa-solid fa-baby-carriage bottle-icon"></i>
                <h2>¿Cuánto tomó?</h2>
                <p class="subtitle">Acción: <strong>{selectedBottleAction}</strong></p>
            </div>
            <div class="modal-body">
                <div class="amount-grid">
                    {#each bottleAmounts as amount}
                        <button 
                            class="amount-btn"
                            class:selected={bottleAmount === amount && !customAmount}
                            on:click={() => selectBottleAmount(amount)}
                        >
                            {amount}ml
                        </button>
                    {/each}
                </div>
                
                <div class="custom-amount">
                    <label for="custom-amount">Cantidad personalizada:</label>
                    <div class="input-group">
                        <input
                            id="custom-amount"
                            type="number"
                            bind:value={customAmount}
                            placeholder="Ej: 75"
                            min="1"
                            max="500"
                            class="custom-input"
                        />
                        <span class="input-suffix">ml</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" on:click={closeBottleModal}>
                    Cancelar
                </button>
                <button 
                    class="btn btn-primary" 
                    style="background-color: {subject?.color}"
                    on:click={confirmBottleAmount}
                >
                    <i class="fa-solid fa-check"></i>
                    Registrar
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal de peso -->
{#if showWeightModal}
    <div class="modal-overlay" on:click={closeWeightModal}>
        <div class="modal-content weight-modal" on:click|stopPropagation>
            <div class="modal-header">
                <i class="fa-solid fa-weight-scale weight-icon"></i>
                <h2>¿Cuánto pesa?</h2>
                <p class="subtitle">Acción: <strong>{selectedWeightAction}</strong></p>
                {#if lastWeight}
                    <p class="last-weight">Último peso: <strong>{lastWeight}</strong></p>
                {/if}
            </div>
            <div class="modal-body">
                <div class="weight-selectors">
                    <div class="weight-group">
                        <label for="kg-slider">Kilogramos</label>
                        <div class="slider-container">
                            <input
                                id="kg-slider"
                                type="range"
                                bind:value={weightKg}
                                min="1"
                                max="15"
                                step="1"
                                class="weight-slider kg-slider"
                            />
                            <div class="slider-value">{weightKg} kg</div>
                        </div>
                    </div>
                    
                    <div class="weight-group">
                        <label for="grams-slider">Gramos</label>
                        <div class="slider-container">
                            <input
                                id="grams-slider"
                                type="range"
                                bind:value={weightGrams}
                                min="0"
                                max="999"
                                step="5"
                                class="weight-slider grams-slider"
                            />
                            <div class="slider-value">{weightGrams.toString().padStart(3, '0')} g</div>
                        </div>
                    </div>
                </div>
                
                <div class="weight-preview">
                    <div class="total-weight">
                        <strong>{weightKg}.{weightGrams.toString().padStart(3, '0')} kg</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" on:click={closeWeightModal}>
                    Cancelar
                </button>
                <button 
                    class="btn btn-primary" 
                    style="background-color: {subject?.color}"
                    on:click={confirmWeightAmount}
                >
                    <i class="fa-solid fa-check"></i>
                    Registrar
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal de estatura -->
{#if showHeightModal}
    <div class="modal-overlay" on:click={closeHeightModal}>
        <div class="modal-content height-modal" on:click|stopPropagation>
            <div class="modal-header">
                <i class="fa-solid fa-ruler-vertical height-icon"></i>
                <h2>¿Cuánto mide?</h2>
                <p class="subtitle">Acción: <strong>{selectedHeightAction}</strong></p>
                {#if lastHeight}
                    <p class="last-height">Última estatura: <strong>{lastHeight}</strong></p>
                {/if}
            </div>
            <div class="modal-body">
                <div class="height-selectors">
                    <div class="height-group">
                        <label for="meters-slider">Metros</label>
                        <div class="slider-container">
                            <input
                                id="meters-slider"
                                type="range"
                                bind:value={heightMeters}
                                min="0"
                                max="2"
                                step="1"
                                class="height-slider meters-slider"
                            />
                            <div class="slider-value">{heightMeters} m</div>
                        </div>
                    </div>
                    
                    <div class="height-group">
                        <label for="centimeters-slider">Centímetros</label>
                        <div class="slider-container">
                            <input
                                id="centimeters-slider"
                                type="range"
                                bind:value={heightCentimeters}
                                min="0"
                                max="99"
                                step="1"
                                class="height-slider centimeters-slider"
                            />
                            <div class="slider-value">{heightCentimeters.toString().padStart(2, '0')} cm</div>
                        </div>
                    </div>
                </div>
                
                <div class="height-preview">
                    <div class="total-height">
                        <strong>{heightMeters}.{heightCentimeters.toString().padStart(2, '0')} m</strong>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" on:click={closeHeightModal}>
                    Cancelar
                </button>
                <button 
                    class="btn btn-primary" 
                    style="background-color: {subject?.color}"
                    on:click={confirmHeightAmount}
                >
                    <i class="fa-solid fa-check"></i>
                    Registrar
                </button>
            </div>
        </div>
    </div>
{/if}

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

    /* Action wrapper with drag and swipe support */
    .action-wrapper {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        user-select: none;
    }

    .action-wrapper:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .action-wrapper.drag-over {
        border-top: 3px solid var(--primary);
        background-color: rgba(68, 129, 153, 0.1);
    }

    .action-wrapper.dragging,
    .action-btn.dragging {
        opacity: 0.5;
        transform: rotate(2deg);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    /* Drag handle */
    .drag-handle {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--gray);
        background: rgba(255, 255, 255, 0.8);
        cursor: grab;
        transition: all 0.2s ease;
        z-index: 5;
        opacity: 0;
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .action-wrapper:hover .drag-handle {
        opacity: 1;
    }

    .drag-handle i {
        font-size: 0.8rem;
        pointer-events: none;
    }

    /* Mobile: Always show drag handle */
    @media (max-width: 768px) {
        .drag-handle {
            opacity: 0.6;
            width: 25px;
        }
        
        .action-wrapper:hover .drag-handle {
            opacity: 1;
        }
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
        padding-left: 50px; /* Espacio para el drag handle */
        border: none;
        cursor: pointer;
        transition: transform 0.3s ease, opacity 0.2s ease;
        font-size: 1rem;
        text-align: left;
        border-radius: 0;
        position: relative;
        z-index: 2;
        width: 100%;
        touch-action: manipulation; /* Mejor para drag and touch */
        background: var(--white); /* Asegurar que tenga fondo */
    }

    .action-btn.dragging {
        cursor: grabbing;
        pointer-events: none;
    }

    /* Mobile: Menos padding para el drag handle */
    @media (max-width: 768px) {
        .action-btn {
            padding-left: 40px;
        }
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

    .btn-danger {
        background-color: #ff6b6b;
        color: var(--white);
    }

    .btn-danger:hover:not(:disabled) {
        background-color: #e55555;
    }

    .btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .warning-icon {
        font-size: 1.5rem;
        color: #ff6b6b;
        margin-bottom: var(--spacing-sm);
    }

    .warning-text {
        color: var(--gray-dark);
        font-size: 0.9rem;
        margin-top: var(--spacing-sm);
        margin-bottom: 0;
    }

    .modal-header {
        text-align: center;
    }

    .modal-header h2 {
        color: var(--dark);
    }

    /* Modal de biberón */
    .bottle-modal {
        max-width: 500px;
    }

    .bottle-icon {
        font-size: 2rem;
        color: #4CAF50;
        margin-bottom: var(--spacing-sm);
    }

    .subtitle {
        color: var(--gray-dark);
        font-size: 0.9rem;
        margin: var(--spacing-xs) 0 0 0;
    }

    .amount-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-lg);
    }

    .amount-btn {
        padding: var(--spacing-md);
        border: 2px solid var(--light);
        background: var(--white);
        color: var(--dark);
        border-radius: var(--radius-sm);
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .amount-btn:hover {
        border-color: var(--primary);
        background: var(--background);
    }

    .amount-btn.selected {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--white);
    }

    .custom-amount {
        border-top: 1px solid var(--light);
        padding-top: var(--spacing-lg);
    }

    .custom-amount label {
        display: block;
        margin-bottom: var(--spacing-sm);
        font-weight: 500;
        color: var(--dark);
    }

    .input-group {
        display: flex;
        align-items: center;
        border: 2px solid var(--light);
        border-radius: var(--radius-sm);
        background: var(--white);
        transition: border-color 0.2s ease;
    }

    .input-group:focus-within {
        border-color: var(--primary);
    }

    .custom-input {
        border: none;
        padding: var(--spacing-md);
        font-size: 1rem;
        flex: 1;
        background: transparent;
    }

    .custom-input:focus {
        outline: none;
    }

    .input-suffix {
        padding: var(--spacing-md);
        color: var(--gray-dark);
        font-weight: 500;
        border-left: 1px solid var(--light);
    }

    /* Responsive para modal de biberón */
    @media (max-width: 640px) {
        .amount-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .bottle-modal {
            margin: var(--spacing-sm);
        }
    }

    /* Estilos para modal de peso */
    .weight-modal {
        max-width: 450px;
    }

    .weight-icon {
        font-size: 1.5rem;
        color: var(--primary);
        margin-bottom: var(--spacing-sm);
    }

    .last-weight {
        color: var(--gray-dark);
        font-size: 0.85rem;
        margin: var(--spacing-xs) 0 0 0;
        font-style: italic;
    }

    .weight-selectors {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
    }

    .weight-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .weight-group label {
        font-weight: 500;
        color: var(--dark);
        font-size: 0.9rem;
    }

    .slider-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .weight-slider {
        flex: 1;
        height: 8px;
        -webkit-appearance: none;
        appearance: none;
        background: var(--light);
        border-radius: 5px;
        outline: none;
        cursor: pointer;
    }

    .weight-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: var(--primary);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .weight-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: var(--primary);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .slider-value {
        min-width: 60px;
        text-align: center;
        font-weight: 600;
        color: var(--primary);
        background: var(--background);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
    }

    .weight-preview {
        border-top: 1px solid var(--light);
        padding-top: var(--spacing-lg);
        text-align: center;
    }

    .total-weight {
        font-size: 1.8rem;
        color: var(--primary);
        background: var(--background);
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-md);
        display: inline-block;
        min-width: 150px;
    }

    /* Responsive para modal de peso */
    @media (max-width: 640px) {
        .weight-modal {
            margin: var(--spacing-sm);
        }
        
        .slider-container {
            flex-direction: column;
            gap: var(--spacing-sm);
            align-items: stretch;
        }
        
        .slider-value {
            min-width: auto;
            text-align: center;
        }
        
        .total-weight {
            font-size: 1.5rem;
            min-width: auto;
        }
    }

    /* Estilos para modal de estatura */
    .height-modal {
        max-width: 450px;
    }

    .height-icon {
        font-size: 1.5rem;
        color: var(--primary);
        margin-bottom: var(--spacing-sm);
    }

    .last-height {
        color: var(--gray-dark);
        font-size: 0.85rem;
        margin: var(--spacing-xs) 0 0 0;
        font-style: italic;
    }

    .height-selectors {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
    }

    .height-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .height-group label {
        font-weight: 500;
        color: var(--dark);
        font-size: 0.9rem;
    }

    .height-slider {
        flex: 1;
        height: 8px;
        -webkit-appearance: none;
        appearance: none;
        background: var(--light);
        border-radius: 5px;
        outline: none;
        cursor: pointer;
    }

    .height-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: var(--secondary, #28a745);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .height-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: var(--secondary, #28a745);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .height-preview {
        border-top: 1px solid var(--light);
        padding-top: var(--spacing-lg);
        text-align: center;
    }

    .total-height {
        font-size: 1.8rem;
        color: var(--secondary, #28a745);
        background: var(--background);
        padding: var(--spacing-md) var(--spacing-lg);
        border-radius: var(--radius-md);
        display: inline-block;
        min-width: 150px;
    }

    /* Responsive para modal de estatura */
    @media (max-width: 640px) {
        .height-modal {
            margin: var(--spacing-sm);
        }
        
        .total-height {
            font-size: 1.5rem;
            min-width: auto;
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