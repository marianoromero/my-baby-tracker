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
      subscribeToEvents
    } from '$lib/stores/events'
    import { family, subjects } from '$lib/stores/family'
    
    let subscription = null
    let selectedSubjects = new Set()
    
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
      <div class="events-list">
        {#each Object.entries(filteredEvents) as [date, dateEvents]}
          <div class="date-group">
            <h3 class="date-header">{date}</h3>
            
            <div class="events">
              {#each dateEvents as event}
                <div 
                  class="event-item"
                  style="border-left-color: {event.subjects?.color}"
                >
                  <div class="event-time">
                    {formatEventTime(event.event_timestamp)}
                  </div>
                  
                  <div class="event-icon" style="background-color: {event.subjects?.color}">
                    <i class="fa-solid {getActionIcon(event.action_name)}"></i>
                  </div>
                  
                  <div class="event-content">
                    <div class="event-subject">
                      <i class="fa-solid {event.subjects?.icon}"></i>
                      {event.subjects?.name}
                    </div>
                    <div class="event-action">{event.action_name}</div>
                    <div class="event-user">por {getUserName(event)}</div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
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
  
    /* Lista de eventos */
    .events-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
  
    .date-group {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
  
    .date-header {
      font-size: 0.875rem;
      color: var(--gray-dark);
      text-transform: capitalize;
      margin: 0;
      padding: var(--spacing-md);
      background: var(--white);
      border-bottom: 1px solid var(--gray);
    }
  
    .events {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
  
    /* Evento individual */
    .event-item {
      display: grid;
      grid-template-columns: auto auto 1fr;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: var(--white);
      border-left: 3px solid;
      align-items: center;
      transition: background-color 0.2s ease;
    }
  
    .event-item:hover {
      background: var(--gray-light);
    }
  
    .event-time {
      font-size: 0.875rem;
      color: var(--gray-dark);
      font-weight: 500;
    }
  
    .event-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
    }
  
    .event-icon i {
      font-size: 1.125rem;
    }
  
    .event-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  
    .event-subject {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-weight: 500;
      color: var(--black);
    }
  
    .event-subject i {
      font-size: 0.875rem;
      color: var(--gray-dark);
    }
  
    .event-action {
      color: var(--black);
      font-size: 0.9rem;
    }
  
    .event-user {
      font-size: 0.75rem;
      color: var(--gray-dark);
    }
  
    /* Agrupar eventos por sujeto */
    .subject-group {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .subject-header {
      padding: var(--spacing-md);
      color: var(--white);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .subject-header i {
      font-size: 1.25rem;
    }

    .subject-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
    }

    .subject-events {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
  
    /* Responsive */
    @media (max-width: 640px) {
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

      .event-item {
        grid-template-columns: auto 1fr;
        gap: var(--spacing-sm);
      }
      
      .event-time {
        grid-column: 1 / -1;
        margin-bottom: var(--spacing-xs);
      }
    }
  </style>