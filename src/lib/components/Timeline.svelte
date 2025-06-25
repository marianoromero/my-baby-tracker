<!-- src/lib/components/Timeline.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte'
    import { 
      events, 
      eventsLoading, 
      selectedFilter, 
      loadEvents, 
      groupedEvents,
      formatEventTime,
      getUserName,
      subscribeToEvents,
      deleteEvent
    } from '$lib/stores/events'
    import { family, subjects } from '$lib/stores/family'
    import { supabase } from '$lib/supabase'
    import DeleteConfirmModal from './DeleteConfirmModal.svelte'
    
    let subscription = null
    let selectedSubjects = new Set()
    
    // Variables para swipe-to-delete y edición
    let swipeData = new Map() // Para trackear el estado de cada evento
    let showDeleteModal = false
    let eventToDelete = null
    let deleting = false
    
    // Variables para edición de eventos
    let showEditModal = false
    let eventToEdit = null
    let editEventName = ''
    let editEventDate = ''
    let editEventTime = ''
    
    const filters = [
      { value: 'today', label: 'Hoy', icon: 'fa-calendar-day' },
      { value: 'yesterday', label: 'Ayer', icon: 'fa-calendar-minus' },
      { value: 'week', label: 'Semana', icon: 'fa-calendar-week' },
      { value: 'month', label: 'Mes', icon: 'fa-calendar-alt' },
      { value: 'all', label: 'Todo', icon: 'fa-calendar' }
    ]
    
    onMount(() => {
      // Cargar eventos iniciales
      loadEvents($selectedFilter)
      
      // Suscribirse a eventos en tiempo real
      if ($family?.id) {
        subscription = subscribeToEvents($family.id)
      }

      // Seleccionar todos los sujetos por defecto
      selectedSubjects = new Set($subjects.map(s => s.id))
    })
    
    onDestroy(() => {
      // Cancelar suscripción
      if (subscription) {
        subscription.unsubscribe()
      }
    })
    
    // Recargar eventos cuando cambie el filtro
    function handleFilterChange(filterValue) {
      selectedFilter.set(filterValue)
      loadEvents(filterValue)
    }

    // Manejar selección de sujetos
    function toggleSubject(subjectId) {
      const newSelectedSubjects = new Set(selectedSubjects)
      if (newSelectedSubjects.has(subjectId)) {
        newSelectedSubjects.delete(subjectId)
      } else {
        newSelectedSubjects.add(subjectId)
      }
      selectedSubjects = newSelectedSubjects
    }
    
    // Obtener el icono del evento basado en la acción
    function getActionIcon(actionName) {
      const iconMap = {
        'Lactancia': 'fa-baby-bottle',
        'Biberón': 'fa-bottle-water',
        'Cambio pañal': 'fa-diaper',
        'Cambió pañal': 'fa-diaper',
        'Cambié pañal': 'fa-diaper',
        'Siesta': 'fa-bed',
        'Dormir noche': 'fa-moon',
        'Despertar': 'fa-sun',
        'Baño': 'fa-bath',
        'Medicamento': 'fa-pills',
        'Salió de casa': 'fa-door-open',
        'Llegó a casa': 'fa-home',
        'Salí de casa': 'fa-door-open',
        'Llegué a casa': 'fa-home'
      }
      
      return iconMap[actionName] || 'fa-check'
    }

    // Funciones para manejar swipe-to-delete
    function handleTouchStart(event, eventData) {
      const touch = event.touches[0]
      swipeData.set(eventData.id, {
        startX: touch.clientX,
        startY: touch.clientY,
        deltaX: 0,
        isSwiping: false,
        revealed: false
      })
    }
    
    function handleTouchMove(event, eventData) {
      const touch = event.touches[0]
      const data = swipeData.get(eventData.id)
      
      if (!data) return
      
      const deltaX = touch.clientX - data.startX
      const deltaY = touch.clientY - data.startY
      
      // Determinar si es un swipe horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        event.preventDefault()
        data.isSwiping = true
        data.deltaX = Math.min(0, deltaX) // Solo permitir swipe hacia la izquierda
        swipeData.set(eventData.id, data)
        swipeData = swipeData // Trigger reactivity
      }
    }
    
    function handleTouchEnd(event, eventData) {
      const data = swipeData.get(eventData.id)
      
      if (!data) return
      
      // Si se deslizó más de 60px, revelar los botones de acción
      if (data.deltaX < -60) {
        data.revealed = true
        data.deltaX = -120 // Mostrar ambos botones completamente
      } else {
        data.revealed = false
        data.deltaX = 0
      }
      
      data.isSwiping = false
      swipeData.set(eventData.id, data)
      swipeData = swipeData // Trigger reactivity
    }
    
    function showEditEventModal(eventData) {
      eventToEdit = eventData
      editEventName = eventData.action_name
      
      // Parsear la fecha y hora del timestamp
      const eventDate = new Date(eventData.event_timestamp)
      editEventDate = eventDate.toISOString().split('T')[0] // YYYY-MM-DD
      editEventTime = eventDate.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
      
      showEditModal = true
      
      // Cerrar el swipe del evento
      const data = swipeData.get(eventData.id)
      if (data) {
        data.revealed = false
        data.deltaX = 0
        swipeData.set(eventData.id, data)
        swipeData = swipeData
      }
    }

    function showDeleteConfirm(eventData) {
      eventToDelete = eventData
      showDeleteModal = true
      
      // Cerrar el swipe del evento
      const data = swipeData.get(eventData.id)
      if (data) {
        data.revealed = false
        data.deltaX = 0
        swipeData.set(eventData.id, data)
        swipeData = swipeData
      }
    }
    
    async function confirmDelete(event) {
      if (!event.detail) return
      
      deleting = true
      const result = await deleteEvent(event.detail.id)
      
      if (result.success) {
        // Limpiar datos del swipe
        swipeData.delete(event.detail.id)
        swipeData = swipeData
        
        // Mostrar notificación de éxito
        showNotification('✅ Evento eliminado correctamente')
      } else {
        showNotification('❌ Error al eliminar el evento')
      }
      
      deleting = false
      eventToDelete = null
    }
    
    function cancelDelete() {
      eventToDelete = null
    }

    async function updateEvent() {
      if (!editEventName.trim() || !editEventDate || !editEventTime || !eventToEdit) return

      try {
        // Combinar fecha y hora en un timestamp ISO
        const combinedDateTime = new Date(`${editEventDate}T${editEventTime}:00`)
        const timestamp = combinedDateTime.toISOString()

        const { error } = await supabase
          .from('events')
          .update({ 
            action_name: editEventName.trim(),
            event_timestamp: timestamp 
          })
          .eq('id', eventToEdit.id)

        if (error) throw error

        showNotification('✅ Evento actualizado correctamente')
        showEditModal = false
        eventToEdit = null
        editEventName = ''
        editEventDate = ''
        editEventTime = ''
        
        // Recargar eventos para mostrar cambios
        loadEvents($selectedFilter)
      } catch (error) {
        console.error('Error al actualizar evento:', error)
        showNotification('❌ Error al actualizar el evento')
      }
    }

    function cancelEdit() {
      showEditModal = false
      eventToEdit = null
      editEventName = ''
      editEventDate = ''
      editEventTime = ''
    }
    
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

    // Filtrar eventos por sujetos seleccionados
    // Hacer que sea reactivo a cambios en subjects para actualizar nombres de usuario  
    $: filteredEvents = $subjects && Object.fromEntries(
      Object.entries($groupedEvents).map(([date, events]) => [
        date,
        events.filter(event => {
          // Si no hay sujetos seleccionados, no mostrar ningún evento
          if (selectedSubjects.size === 0) return false
          
          // Verificar si el evento tiene un sujeto válido y está seleccionado
          return event.subjects && selectedSubjects.has(event.subjects.id)
        })
      ]).filter(([_, events]) => events.length > 0) // Eliminar fechas sin eventos
    )
  </script>
  
  <div class="timeline-container">
    <!-- Filtros de tiempo -->
    <div class="filter-tabs">
      {#each filters as filter}
        <button
          class="filter-tab"
          class:active={$selectedFilter === filter.value}
          on:click={() => handleFilterChange(filter.value)}
        >
          <i class="fa-solid {filter.icon}"></i>
          <span>{filter.label}</span>
        </button>
      {/each}
    </div>

    <!-- Filtros de sujetos -->
    <div class="subject-filters">
      {#each $subjects as subject}
        <label class="subject-filter">
          <input
            type="checkbox"
            checked={selectedSubjects.has(subject.id)}
            on:change={() => toggleSubject(subject.id)}
          />
          <i class="fa-solid {subject.icon}"></i>
          <span>{subject.name}</span>
        </label>
      {/each}
    </div>
    
    <!-- Lista de eventos -->
    {#if $eventsLoading}
      <div class="loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Cargando eventos...</p>
      </div>
    {:else if Object.keys(filteredEvents).length === 0}
      <div class="empty-state">
        <i class="fa-solid fa-clipboard-list"></i>
        <p>No hay eventos registrados en este período</p>
      </div>
    {:else}
      <div class="vertical-timeline">
        <!-- Línea central -->
        <div class="timeline-line"></div>
        
        {#each Object.entries(filteredEvents) as [date, dateEvents]}
          <!-- Encabezado de fecha -->
          <div class="date-divider">
            <div class="date-circle">
              <i class="fa-solid fa-calendar"></i>
            </div>
            <div class="date-label">{date}</div>
          </div>
          
          {#each dateEvents as event, index}
            <div class="timeline-item" class:left={index % 2 === 0} class:right={index % 2 === 1}>
              <!-- Círculo conector -->
              <div class="timeline-connector">
                <div class="connector-circle" style="background-color: {event.subjects?.color}">
                  <i class="fa-solid {getActionIcon(event.action_name)}"></i>
                </div>
              </div>
              
              <!-- Tarjeta del evento -->
              <div class="timeline-card-wrapper" class:swiped={swipeData.get(event.id)?.revealed}>
                <!-- Botones de acción (background) -->
                <div class="actions-background">
                  <button 
                    class="action-background-btn edit-button"
                    on:click={() => showEditEventModal(event)}
                  >
                    <i class="fa-solid fa-pen"></i>
                    <span>Editar</span>
                  </button>
                  <button 
                    class="action-background-btn delete-button"
                    on:click={() => showDeleteConfirm(event)}
                  >
                    <i class="fa-solid fa-trash"></i>
                    <span>Eliminar</span>
                  </button>
                </div>
                
                <!-- Tarjeta principal (foreground) -->
                <div 
                  class="timeline-card"
                  class:swiping={swipeData.get(event.id)?.isSwiping}
                  class:swiped={swipeData.get(event.id)?.revealed}
                  style="transform: translateX({swipeData.get(event.id)?.deltaX || 0}px);"
                  on:touchstart={(e) => handleTouchStart(e, event)}
                  on:touchmove={(e) => handleTouchMove(e, event)}
                  on:touchend={(e) => handleTouchEnd(e, event)}
                >
                  <!-- Flecha pointing hacia la línea -->
                  <div class="card-arrow"></div>
                  
                  <div class="card-header">
                    <div class="card-time">
                      {formatEventTime(event.event_timestamp)}
                    </div>
                  </div>
                  
                  <div class="card-content">
                    <div class="card-subject" style="color: {event.subjects?.color}">
                      <i class="fa-solid {event.subjects?.icon}"></i>
                      <span class="subject-name">{event.subjects?.name}</span>
                    </div>
                    <div class="card-action">{event.action_name}</div>
                    <div class="card-user">por {getUserName(event)}</div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Modal de edición de evento -->
  {#if showEditModal && eventToEdit}
    <div class="modal-overlay" on:click={cancelEdit}>
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h2>Editar Evento</h2>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="edit-event-name">Nombre del evento:</label>
            <input
              id="edit-event-name"
              type="text"
              bind:value={editEventName}
              placeholder="Nombre del evento"
              class="edit-input"
            />
          </div>
          
          <div class="form-group">
            <label for="edit-event-date">Fecha:</label>
            <input
              id="edit-event-date"
              type="date"
              bind:value={editEventDate}
              class="edit-input"
            />
          </div>
          
          <div class="form-group">
            <label for="edit-event-time">Hora:</label>
            <input
              id="edit-event-time"
              type="time"
              bind:value={editEventTime}
              class="edit-input"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" on:click={cancelEdit}>
            Cancelar
          </button>
          <button 
            class="btn btn-primary" 
            on:click={updateEvent}
            disabled={!editEventName.trim() || !editEventDate || !editEventTime}
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
    eventData={eventToDelete}
    on:confirm={confirmDelete}
    on:cancel={cancelDelete}
  />
  
  <style>
    .timeline-container {
      background: var(--gray-light);
      padding: 0;
      width: 100%;
    }
  
    /* Filtros de tiempo */
    .filter-tabs {
      display: flex;
      width: 100%;
      gap: 2px;
      margin-bottom: 2px;
      background: var(--white);
      padding: 2px;
    }
  
    .filter-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm);
      background: var(--gray-light);
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      min-width: 0; /* Permite que el texto se ajuste */
    }
  
    .filter-tab:hover {
      background: var(--gray);
    }
  
    .filter-tab.active {
      background: var(--primary);
      color: var(--white);
    }
  
    .filter-tab i {
      font-size: 0.875rem;
    }

    /* Filtros de sujetos */
    .subject-filters {
      display: flex;
      justify-content: space-between;
      width: 100%;
      padding: var(--spacing-md);
      background: var(--white);
      margin-bottom: 2px;
    }

    .subject-filter {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      cursor: pointer;
      user-select: none;
    }

    .subject-filter input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      border-radius: 0;
      accent-color: var(--primary);
    }

    .subject-filter i {
      font-size: 1.25rem;
    }
  
    /* Estados vacíos y carga */
    .loading, .empty-state {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--gray-dark);
      background: var(--white);
    }
  
    .loading i, .empty-state i {
      font-size: 2rem;
      margin-bottom: var(--spacing-md);
      color: var(--primary);
    }
  
    /* Timeline vertical */
    .vertical-timeline {
      position: relative;
      padding: var(--spacing-md) var(--spacing-sm);
      background: var(--white);
      min-height: 500px;
    }

    /* Línea central */
    .timeline-line {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--gray);
      transform: translateX(-50%);
      z-index: 1;
    }

    /* Divisor de fecha */
    .date-divider {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: var(--spacing-md) 0 calc(var(--spacing-lg) + var(--spacing-md)) 0;
      z-index: 3;
      min-height: 120px;
    }

    .date-circle {
      width: 60px;
      height: 60px;
      background: var(--primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      font-size: 1.2rem;
      box-shadow: var(--shadow-md);
      position: relative;
      z-index: 4;
    }

    .date-label {
      position: absolute;
      top: 75px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary);
      color: var(--white);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
      text-transform: capitalize;
    }

    /* Item del timeline */
    .timeline-item {
      position: relative;
      margin-bottom: var(--spacing-sm);
      z-index: 2;
      min-height: 70px;
      display: flex;
      align-items: flex-start;
      padding-top: 5px;
    }

    /* Posicionamiento alternante */
    .timeline-item.left {
      justify-content: flex-end;
      padding-right: calc(50% + 30px);
    }

    .timeline-item.right {
      justify-content: flex-start;
      padding-left: calc(50% + 30px);
    }

    /* Círculo conector */
    .timeline-connector {
      position: absolute;
      left: 50%;
      top: 15px;
      transform: translateX(-50%);
      z-index: 3;
    }

    .connector-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      border: 3px solid var(--white);
      box-shadow: var(--shadow-md);
    }

    .connector-circle i {
      font-size: 1rem;
    }

    /* Wrapper de tarjeta para swipe */
    .timeline-card-wrapper {
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-md);
      width: 100%;
      max-width: 350px;
    }

    /* Botones de acción en timeline */
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
        background: var(--white);
        border-radius: 0 var(--radius-md) var(--radius-md) 0;
      }
      
      .action-background-btn {
        background: transparent;
        color: transparent;
        position: relative;
        z-index: 2;
      }
      
      .action-background-btn i {
        font-size: 1.8rem;
        color: transparent;
        transition: all 0.2s ease;
      }
      
      .action-background-btn span {
        display: none;
      }
      
      /* Mostrar iconos cuando el botón principal está deslizado */
      .timeline-card-wrapper.swiped .edit-button {
        background: transparent;
      }
      
      .timeline-card-wrapper.swiped .edit-button i {
        color: #4CAF50 !important;
        transform: scale(1.2);
      }
      
      .timeline-card-wrapper.swiped .delete-button {
        background: transparent;
      }
      
      .timeline-card-wrapper.swiped .delete-button i {
        color: #ff6b6b !important;
        transform: scale(1.2);
      }
      
      .action-background-btn:active {
        opacity: 0.7;
        transform: scale(0.95);
      }
    }

    /* Tarjeta del evento */
    .timeline-card {
      background: var(--white);
      border-radius: var(--radius-md);
      padding: var(--spacing-md);
      box-shadow: var(--shadow-md);
      position: relative;
      z-index: 2;
      transition: transform 0.3s ease, box-shadow 0.2s ease;
      touch-action: pan-y;
    }

    .timeline-card.swiping {
      transition: none;
    }

    .timeline-card:hover {
      box-shadow: var(--shadow-lg);
    }

    /* Flecha pointing hacia la línea */
    .card-arrow {
      position: absolute;
      top: 15px;
      width: 0;
      height: 0;
      border: 8px solid transparent;
    }

    .timeline-item.left .card-arrow {
      right: -16px;
      border-left-color: var(--white);
    }

    .timeline-item.right .card-arrow {
      left: -16px;
      border-right-color: var(--white);
    }

    /* Contenido de la tarjeta */
    .card-header {
      margin-bottom: var(--spacing-sm);
      text-align: right;
    }

    .timeline-item.right .card-header {
      text-align: left;
    }

    .card-time {
      font-size: 0.8rem;
      color: var(--gray-dark);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .card-subject {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
    }

    .card-subject i {
      font-size: 1rem;
    }

    .subject-name {
      font-weight: 700;
    }

    .card-action {
      font-size: 1rem;
      font-weight: 500;
      color: var(--dark);
      line-height: 1.4;
      margin-bottom: var(--spacing-xs);
    }

    .card-user {
      font-size: 0.75rem;
      color: var(--gray-dark);
      font-style: italic;
    }
  
    /* Responsive */
    @media (max-width: 768px) {
      .filter-tabs {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      .filter-tabs::-webkit-scrollbar {
        display: none;
      }

      .filter-tab {
        white-space: nowrap;
      }

      .subject-filters {
        flex-wrap: wrap;
        gap: var(--spacing-md);
      }

      .subject-filter {
        flex: 1;
        min-width: 120px;
      }

      /* Timeline mobile: mantener alternancia */
      .vertical-timeline {
        padding: var(--spacing-sm);
      }

      .timeline-line {
        left: 50%;
        transform: translateX(-50%);
        width: 2px;
      }

      .timeline-item {
        margin-bottom: var(--spacing-xs);
        min-height: 60px;
        width: 100%;
      }

      .timeline-item.left {
        justify-content: flex-end;
        padding-right: calc(50% + 20px);
        padding-left: var(--spacing-xs);
      }

      .timeline-item.right {
        justify-content: flex-start;
        padding-left: calc(50% + 20px);
        padding-right: var(--spacing-xs);
      }

      /* Alineación específica para las tarjetas */
      .timeline-item.left .timeline-card-wrapper {
        text-align: right;
      }

      .timeline-item.right .timeline-card-wrapper {
        text-align: left;
      }

      .timeline-connector {
        left: 50%;
        transform: translateX(-50%);
        top: 10px;
      }

      .connector-circle {
        width: 30px;
        height: 30px;
        font-size: 0.8rem;
      }

      .timeline-card-wrapper {
        max-width: none;
        width: 100%;
        flex: 1;
      }

      .timeline-card {
        width: 100%;
        margin: 0;
        padding: var(--spacing-sm);
      }

      .card-arrow {
        display: none; /* Ocultar flechas en mobile */
      }

      .date-divider {
        justify-content: center;
        margin: var(--spacing-xl) 0 calc(var(--spacing-lg) + var(--spacing-md)) 0;
        min-height: 100px;
      }

      .date-circle {
        width: 40px;
        height: 40px;
        font-size: 0.9rem;
      }

      .date-label {
        top: 50px;
        font-size: 0.7rem;
        left: 50%;
        transform: translateX(-50%);
      }

      /* Alineación del contenido según posición */
      .timeline-item.left .card-header {
        text-align: right !important;
      }

      .timeline-item.right .card-header {
        text-align: left !important;
      }

      .timeline-item.left .card-content {
        text-align: right;
      }

      .timeline-item.right .card-content {
        text-align: left;
      }

      .timeline-item.left .card-subject {
        justify-content: flex-end;
      }

      .timeline-item.right .card-subject {
        justify-content: flex-start;
      }

      .card-subject {
        font-size: 1rem;
      }

      .card-action {
        font-size: 0.95rem;
      }

      .card-content {
        gap: var(--spacing-xs);
      }
    }

    /* Estilos para el modal de edición */
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
      text-align: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--dark);
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .form-group {
      margin-bottom: var(--spacing-md);
    }

    .form-group label {
      display: block;
      margin-bottom: var(--spacing-xs);
      font-weight: 500;
      color: var(--dark);
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

    .btn-secondary {
      background-color: var(--gray);
      color: var(--white);
    }

    .btn-secondary:hover {
      background-color: var(--gray-dark);
    }

    /* Ajustes adicionales para pantallas muy pequeñas */
    @media (max-width: 480px) {
      .timeline-item.left {
        padding-right: calc(50% + 15px);
        padding-left: 5px;
      }

      .timeline-item.right {
        padding-left: calc(50% + 15px);
        padding-right: 5px;
      }

      .date-circle {
        width: 35px;
        height: 35px;
        font-size: 0.8rem;
      }

      .date-label {
        font-size: 0.65rem;
      }

      .connector-circle {
        width: 25px;
        height: 25px;
        font-size: 0.7rem;
      }

      .timeline-card {
        padding: var(--spacing-xs);
      }

      .timeline-card-wrapper {
        max-width: 135px;
      }

      /* Mayor separación para evitar solapamiento */
      .date-divider {
        margin: calc(var(--spacing-xl) + var(--spacing-md)) 0 calc(var(--spacing-xl) + var(--spacing-sm)) 0;
        min-height: 90px;
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
      z-index: 10001;
      font-size: 0.9rem;
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