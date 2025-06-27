<!-- src/routes/stats/+page.svelte -->
<script>
    import { onMount } from 'svelte'
    import { goto } from '$app/navigation'
    import { base } from '$app/paths'
    import { supabase } from '$lib/supabase'
    import { family, subjects } from '$lib/stores/family'
    
    let sleepData = []
    let bottleData = []
    let growthData = []
    let currentWeekStart = new Date()
    let loading = true
    let viewMode = 'chart' // 'chart' o 'table'
    
    // Configurar el inicio de la semana (lunes)
    function getWeekStart(date) {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que lunes sea día 1
        return new Date(d.setDate(diff))
    }
    
    // Formatear fecha para mostrar
    function formatWeekRange(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        const options = { day: 'numeric', month: 'short' }
        return `${weekStart.toLocaleDateString('es-ES', options)} - ${weekEnd.toLocaleDateString('es-ES', options)}`
    }
    
    // Calcular horas de sueño por día
    async function calculateSleepHours(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        
        const { data: events, error } = await supabase
            .from('events')
            .select('*, subjects(*)')
            .gte('event_timestamp', weekStart.toISOString())
            .lt('event_timestamp', weekEnd.toISOString())
            .order('event_timestamp')
        
        if (error) {
            console.error('Error loading events:', error)
            return {}
        }
        
        const sleepEvents = events.filter(event => 
            event.action_name.toLowerCase().includes('dorm') || 
            event.action_name.toLowerCase().includes('despiert')
        )
        
        const dailySleep = {}
        let sleepStart = null
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(weekStart.getDate() + i)
            const dayKey = day.toISOString().split('T')[0]
            dailySleep[dayKey] = 0
        }
        
        sleepEvents.forEach(event => {
            const isGoingToSleep = event.action_name.toLowerCase().includes('dorm')
            const eventDate = new Date(event.event_timestamp)
            const dayKey = eventDate.toISOString().split('T')[0]
            
            if (isGoingToSleep) {
                sleepStart = eventDate
            } else if (sleepStart && !isGoingToSleep) {
                // Se despierta
                const sleepDuration = (eventDate - sleepStart) / (1000 * 60 * 60) // horas
                if (sleepDuration > 0 && sleepDuration < 24) { // Validar duración razonable
                    dailySleep[dayKey] += sleepDuration
                }
                sleepStart = null
            }
        })
        
        return dailySleep
    }
    
    // Calcular mililitros de biberón por día
    async function calculateBottleVolume(weekStart) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)
        
        const { data: events, error } = await supabase
            .from('events')
            .select('*, subjects(*)')
            .gte('event_timestamp', weekStart.toISOString())
            .lt('event_timestamp', weekEnd.toISOString())
            .order('event_timestamp')
        
        if (error) {
            console.error('Error loading events:', error)
            return {}
        }
        
        const bottleEvents = events.filter(event => 
            event.action_name.toLowerCase().includes('biber') ||
            event.action_name.toLowerCase().includes('bibi') ||
            event.action_name.toLowerCase().includes('botella')
        )
        
        const dailyBottle = {}
        
        // Inicializar días de la semana
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(weekStart.getDate() + i)
            const dayKey = day.toISOString().split('T')[0]
            dailyBottle[dayKey] = 0
        }
        
        bottleEvents.forEach(event => {
            // Extraer cantidad de los paréntesis
            const match = event.action_name.match(/\((\d+)ml\)/)
            if (match) {
                const volume = parseInt(match[1])
                const eventDate = new Date(event.event_timestamp)
                const dayKey = eventDate.toISOString().split('T')[0]
                dailyBottle[dayKey] += volume
            }
        })
        
        return dailyBottle
    }
    
    // Cargar datos de crecimiento (peso y estatura) - historial completo
    async function loadGrowthData() {
        try {
            const { data: events, error } = await supabase
                .from('events')
                .select('action_name, event_timestamp, subjects(name)')
                .or('action_name.ilike.%peso%,action_name.ilike.%estatura%')
                .order('event_timestamp', { ascending: true })
            
            if (error) {
                console.error('Error loading growth data:', error)
                return
            }
            
            // Procesar eventos para extraer datos
            const growthMap = new Map()
            
            events.forEach(event => {
                const date = new Date(event.event_timestamp).toISOString().split('T')[0] // YYYY-MM-DD
                const dateObj = new Date(event.event_timestamp)
                const formattedDate = dateObj.toLocaleDateString('es-ES')
                
                if (!growthMap.has(date)) {
                    growthMap.set(date, {
                        date: date,
                        formattedDate: formattedDate,
                        weight: null,
                        height: null,
                        timestamp: dateObj
                    })
                }
                
                const entry = growthMap.get(date)
                
                // Extraer peso
                if (event.action_name.toLowerCase().includes('peso')) {
                    const weightMatch = event.action_name.match(/\(([0-9]+\.?[0-9]*)kg\)/)
                    if (weightMatch) {
                        entry.weight = parseFloat(weightMatch[1])
                    }
                }
                
                // Extraer estatura
                if (event.action_name.toLowerCase().includes('estatura')) {
                    const heightMatch = event.action_name.match(/\(([0-9]+\.?[0-9]*)m\)/)
                    if (heightMatch) {
                        entry.height = parseFloat(heightMatch[1]) * 100 // Convertir a cm
                    }
                }
            })
            
            // Convertir a array y ordenar por fecha (más reciente primero para tabla)
            growthData = Array.from(growthMap.values())
                .filter(entry => entry.weight !== null || entry.height !== null)
                .sort((a, b) => b.timestamp - a.timestamp) // Orden inverso para tabla
                
            console.log('Growth data loaded:', growthData)
            
        } catch (error) {
            console.error('Error loading growth data:', error)
        }
    }
    
    // Cargar datos de la semana
    async function loadWeekData() {
        loading = true
        const weekStart = getWeekStart(currentWeekStart)
        
        const [sleepHours, bottleVolume] = await Promise.all([
            calculateSleepHours(weekStart),
            calculateBottleVolume(weekStart),
            loadGrowthData()
        ])
        
        // Convertir a arrays para los gráficos
        sleepData = Object.entries(sleepHours).map(([date, hours]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: Math.round(hours * 10) / 10 // Redondear a 1 decimal
        }))
        
        bottleData = Object.entries(bottleVolume).map(([date, ml]) => ({
            date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
            value: ml
        }))
        
        loading = false
    }
    
    // Navegar semanas
    function previousWeek() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7)
        currentWeekStart = new Date(currentWeekStart)
        loadWeekData()
    }
    
    function nextWeek() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7)
        currentWeekStart = new Date(currentWeekStart)
        loadWeekData()
    }
    
    // Alternar entre vista de gráfico y tabla
    function toggleViewMode() {
        viewMode = viewMode === 'chart' ? 'table' : 'chart'
    }
    
    onMount(() => {
        currentWeekStart = getWeekStart(new Date())
        loadWeekData()
    })
</script>

<div class="container">
    <header>
        <button class="back-button" on:click={() => goto(`${base}/dashboard`)}>
            <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Estadísticas</h1>
    </header>

    <main>
        {#if loading}
            <div class="loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Cargando estadísticas...</p>
            </div>
        {:else}
            <!-- Navegación de semana -->
            <div class="week-navigation">
                <button class="nav-button" on:click={previousWeek}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="week-range">{formatWeekRange(getWeekStart(currentWeekStart))}</span>
                <button class="nav-button" on:click={nextWeek}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <!-- Sección de crecimiento (Peso y Estatura) -->
            <div class="growth-section">
                <div class="section-header">
                    <h2>Crecimiento (Peso y Estatura)</h2>
                    <button class="toggle-button" on:click={toggleViewMode}>
                        <i class="fa-solid {viewMode === 'chart' ? 'fa-table' : 'fa-chart-line'}"></i>
                        {viewMode === 'chart' ? 'Ver Tabla' : 'Ver Gráfico'}
                    </button>
                </div>
                
                {#if growthData.length === 0}
                    <div class="no-data">
                        <i class="fa-solid fa-info-circle"></i>
                        <p>No hay datos de peso o estatura registrados</p>
                    </div>
                {:else}
                    {#if viewMode === 'chart'}
                        <!-- Vista de gráficos separados -->
                        <div class="dual-charts">
                            <!-- Gráfico de Peso -->
                            {#if growthData.filter(entry => entry.weight !== null).length > 0}
                                {@const weightData = growthData.filter(entry => entry.weight !== null).sort((a, b) => a.timestamp - b.timestamp)}
                                {@const minWeight = Math.min(...weightData.map(p => p.weight))}
                                {@const maxWeight = Math.max(...weightData.map(p => p.weight))}
                                {@const weightRange = maxWeight - minWeight || 1}
                                <div class="chart-section">
                                    <h3>Evolución del Peso</h3>
                                    <div class="chart-container">
                                        <svg class="line-chart" viewBox="0 0 800 300">
                                            <!-- Grid background -->
                                            <defs>
                                                <pattern id="weight-grid" width="40" height="15" patternUnits="userSpaceOnUse">
                                                    <path d="M 40 0 L 0 0 0 15" fill="none" stroke="#f0f0f0" stroke-width="1"/>
                                                </pattern>
                                            </defs>
                                            <rect width="800" height="300" fill="url(#weight-grid)" />
                                            
                                            <!-- Weight line -->
                                            {#if weightData.length > 1}
                                                {#each weightData as point, i}
                                                    {#if i < weightData.length - 1}
                                                        {@const nextPoint = weightData[i + 1]}
                                                        <line
                                                            x1={(i / (weightData.length - 1)) * 750 + 25}
                                                            y1={250 - ((point.weight - minWeight) / weightRange) * 200}
                                                            x2={((i + 1) / (weightData.length - 1)) * 750 + 25}
                                                            y2={250 - ((nextPoint.weight - minWeight) / weightRange) * 200}
                                                            stroke="#ff6b6b"
                                                            stroke-width="3"
                                                        />
                                                    {/if}
                                                {/each}
                                            {/if}
                                            
                                            <!-- Weight points -->
                                            {#each weightData as point, i}
                                                <circle
                                                    cx={(i / Math.max(weightData.length - 1, 1)) * 750 + 25}
                                                    cy={250 - ((point.weight - minWeight) / weightRange) * 200}
                                                    r="6"
                                                    fill="#ff6b6b"
                                                    stroke="#fff"
                                                    stroke-width="2"
                                                />
                                                <!-- Value labels -->
                                                <text
                                                    x={(i / Math.max(weightData.length - 1, 1)) * 750 + 25}
                                                    y={250 - ((point.weight - minWeight) / weightRange) * 200 - 15}
                                                    text-anchor="middle"
                                                    fill="#666"
                                                    font-size="12"
                                                    font-weight="bold"
                                                >
                                                    {point.weight.toFixed(2)}kg
                                                </text>
                                            {/each}
                                        </svg>
                                    </div>
                                </div>
                            {/if}
                            
                            <!-- Gráfico de Estatura -->
                            {#if growthData.filter(entry => entry.height !== null).length > 0}
                                {@const heightData = growthData.filter(entry => entry.height !== null).sort((a, b) => a.timestamp - b.timestamp)}
                                {@const minHeight = Math.min(...heightData.map(p => p.height))}
                                {@const maxHeight = Math.max(...heightData.map(p => p.height))}
                                {@const heightRange = maxHeight - minHeight || 1}
                                <div class="chart-section">
                                    <h3>Evolución de la Estatura</h3>
                                    <div class="chart-container">
                                        <svg class="line-chart" viewBox="0 0 800 300">
                                            <!-- Grid background -->
                                            <defs>
                                                <pattern id="height-grid" width="40" height="15" patternUnits="userSpaceOnUse">
                                                    <path d="M 40 0 L 0 0 0 15" fill="none" stroke="#f0f0f0" stroke-width="1"/>
                                                </pattern>
                                            </defs>
                                            <rect width="800" height="300" fill="url(#height-grid)" />
                                            
                                            <!-- Height line -->
                                            {#if heightData.length > 1}
                                                {#each heightData as point, i}
                                                    {#if i < heightData.length - 1}
                                                        {@const nextPoint = heightData[i + 1]}
                                                        <line
                                                            x1={(i / (heightData.length - 1)) * 750 + 25}
                                                            y1={250 - ((point.height - minHeight) / heightRange) * 200}
                                                            x2={((i + 1) / (heightData.length - 1)) * 750 + 25}
                                                            y2={250 - ((nextPoint.height - minHeight) / heightRange) * 200}
                                                            stroke="#4ecdc4"
                                                            stroke-width="3"
                                                        />
                                                    {/if}
                                                {/each}
                                            {/if}
                                            
                                            <!-- Height points -->
                                            {#each heightData as point, i}
                                                <circle
                                                    cx={(i / Math.max(heightData.length - 1, 1)) * 750 + 25}
                                                    cy={250 - ((point.height - minHeight) / heightRange) * 200}
                                                    r="6"
                                                    fill="#4ecdc4"
                                                    stroke="#fff"
                                                    stroke-width="2"
                                                />
                                                <!-- Value labels -->
                                                <text
                                                    x={(i / Math.max(heightData.length - 1, 1)) * 750 + 25}
                                                    y={250 - ((point.height - minHeight) / heightRange) * 200 - 15}
                                                    text-anchor="middle"
                                                    fill="#666"
                                                    font-size="12"
                                                    font-weight="bold"
                                                >
                                                    {point.height.toFixed(2)}cm
                                                </text>
                                            {/each}
                                        </svg>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <!-- Vista de tabla -->
                        <div class="growth-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Peso</th>
                                        <th>Estatura</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each growthData as entry}
                                        <tr>
                                            <td>{entry.formattedDate}</td>
                                            <td>{entry.weight ? `${entry.weight.toFixed(2)} kg` : '-'}</td>
                                            <td>{entry.height ? `${entry.height.toFixed(2)} cm` : '-'}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                {/if}
            </div>

            <!-- Gráfico de sueño - OCULTO TEMPORALMENTE -->
            <!-- <div class="chart-section">
                <h2>Horas de sueño por día</h2>
                <div class="chart">
                    {#each sleepData as day}
                        <div class="bar-container">
                            <div class="bar sleep-bar" style="height: {(day.value / 12) * 100}%"></div>
                            <span class="bar-value">{day.value}h</span>
                            <span class="bar-label">{day.date}</span>
                        </div>
                    {/each}
                </div>
            </div> -->

            <!-- Gráfico de biberón -->
            <div class="chart-section">
                <h2>Mililitros de biberón por día</h2>
                <div class="chart">
                    {#each bottleData as day}
                        <div class="bar-container">
                            <div class="bar bottle-bar" style="height: {(day.value / 800) * 100}%"></div>
                            <span class="bar-value">{day.value}ml</span>
                            <span class="bar-label">{day.date}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
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
        padding: var(--spacing-md);
        flex: 1;
    }

    .loading {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--gray-dark);
    }

    .loading i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        color: var(--primary);
    }

    .week-navigation {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        background: var(--white);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
    }

    .nav-button {
        background: var(--primary);
        color: var(--white);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .nav-button:hover {
        background: var(--primary-dark);
        transform: scale(1.05);
    }

    .week-range {
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--dark);
        min-width: 150px;
        text-align: center;
    }

    .chart-section {
        background: var(--white);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
        box-shadow: var(--shadow-sm);
    }

    .chart-section h2 {
        margin: 0 0 var(--spacing-lg) 0;
        color: var(--dark);
        font-size: 1.25rem;
        text-align: center;
    }

    .chart {
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 200px;
        gap: var(--spacing-xs);
        padding: var(--spacing-md) 0;
        border-bottom: 2px solid var(--light);
        position: relative;
    }

    .bar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        height: 100%;
        position: relative;
    }

    .bar {
        width: 100%;
        max-width: 40px;
        min-height: 5px;
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        transition: all 0.3s ease;
        margin-bottom: auto;
    }


    .bottle-bar {
        background: linear-gradient(to top, #2196F3, #42A5F5);
    }

    .bar:hover {
        transform: scaleY(1.05);
        box-shadow: var(--shadow-md);
    }

    .bar-value {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--dark);
        margin-top: var(--spacing-xs);
        white-space: nowrap;
    }

    .bar-label {
        font-size: 0.7rem;
        color: var(--gray-dark);
        margin-top: var(--spacing-xs);
        text-align: center;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .chart {
            gap: 2px;
        }

        .bar {
            max-width: 30px;
        }

        .bar-value {
            font-size: 0.7rem;
        }

        .bar-label {
            font-size: 0.6rem;
        }

        .week-range {
            font-size: 1rem;
            min-width: 120px;
        }
    }

    /* Estilos para sección de crecimiento */
    .growth-section {
        background: var(--white);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-lg);
        box-shadow: var(--shadow-sm);
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-lg);
    }

    .section-header h2 {
        margin: 0;
        color: var(--dark);
        font-size: 1.25rem;
    }

    .toggle-button {
        background: var(--primary);
        color: var(--white);
        border: none;
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        transition: all 0.2s ease;
    }

    .toggle-button:hover {
        background: var(--primary-dark);
        transform: translateY(-1px);
    }

    .no-data {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--gray-dark);
    }

    .no-data i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        color: var(--gray);
    }

    /* Estilos para gráficos duales */
    .dual-charts {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xl);
    }

    .dual-charts .chart-section {
        background: var(--background);
        border-radius: var(--radius-sm);
        padding: var(--spacing-lg);
        border: 1px solid var(--light);
    }

    .dual-charts .chart-section h3 {
        margin: 0 0 var(--spacing-md) 0;
        color: var(--dark);
        font-size: 1.1rem;
        text-align: center;
        font-weight: 600;
    }

    .chart-container {
        position: relative;
    }

    .line-chart {
        width: 100%;
        height: auto;
        max-height: 300px;
        background: var(--white);
        border-radius: var(--radius-sm);
        border: 1px solid var(--light);
    }


    /* Estilos para tabla */
    .growth-table {
        overflow-x: auto;
    }

    .growth-table table {
        width: 100%;
        border-collapse: collapse;
        background: var(--white);
        border-radius: var(--radius-sm);
        overflow: hidden;
    }

    .growth-table th,
    .growth-table td {
        padding: var(--spacing-md);
        text-align: left;
        border-bottom: 1px solid var(--light);
    }

    .growth-table th {
        background: var(--background);
        font-weight: 600;
        color: var(--dark);
        position: sticky;
        top: 0;
    }

    .growth-table tr:nth-child(even) {
        background: var(--background);
    }

    .growth-table tr:hover {
        background: var(--primary)11;
    }

    .growth-table td {
        font-size: 0.95rem;
        color: var(--dark);
    }

    /* Responsive para sección de crecimiento */
    @media (max-width: 640px) {
        .section-header {
            flex-direction: column;
            gap: var(--spacing-md);
            align-items: stretch;
        }
        
        .toggle-button {
            justify-content: center;
        }
        
        
        .growth-table {
            font-size: 0.85rem;
        }
        
        .growth-table th,
        .growth-table td {
            padding: var(--spacing-sm);
        }
        
        .dual-charts .chart-section {
            padding: var(--spacing-md);
        }
        
        .dual-charts .chart-section h3 {
            font-size: 1rem;
        }
        
        .line-chart text {
            font-size: 10px;
        }
    }
</style>