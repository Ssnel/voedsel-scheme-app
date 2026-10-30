import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChefHat,
  ChevronDown, Clock3, Copy, Flame, Heart, Leaf, ListChecks, Plus, Printer,
  RefreshCw, Search, Settings2, ShoppingBasket, SlidersHorizontal, Sparkles,
  Trash2, Users, X,
} from 'lucide-react';
import { recipes } from './recipes';
import {
  buildShoppingList, createPlan, formatAmount, getActiveMonday,
  eligibleRecipes, getTodayKey, loadState, recipeForDay, STORAGE_KEY,
} from './planner';
import type { FoodCategory, PlannerState, PlannedDay, Recipe, Settings, ShoppingItem } from './types';

type Page = 'today' | 'week' | 'shopping' | 'recipes' | 'settings';
const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const categories: FoodCategory[] = [
  'Vlees & gevogelte', 'Vis', 'Groenten', 'Fruit', 'Zuivel',
  'Droge voeding', 'Kruiden & sauzen', 'Overige producten',
];
const filters = ['Alles', 'Kip', 'Kalkoen', 'Rund', 'Zalm', 'Witte vis', 'Vegetarisch'];
const fallbackImage = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80';

function freshState(): PlannerState {
  const previous = loadState();
  const week = getActiveMonday();
  if (previous.planWeek === week && previous.plan.length === 7) return previous;
  const plan = createPlan(week, previous.settings, previous.history);
  const today = getTodayKey();
  const history = [
    ...previous.history,
    ...plan.map((day) => ({ recipeId: day.recipeId, date: day.date < today ? today : day.date })),
  ].filter((entry, index, list) => list.findIndex((other) => other.recipeId === entry.recipeId && other.date === entry.date) === index);
  return {
    ...previous,
    planWeek: week,
    plan,
    history,
    shopping: buildShoppingList(plan, previous.shopping),
  };
}

function App() {
  const [state, setState] = useState<PlannerState>(freshState);
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState<Page>('today');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [pickForDate, setPickForDate] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Alles');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notice, setNotice] = useState('');
  const [shoppingDraft, setShoppingDraft] = useState('');
  const [servingMultiplier, setServingMultiplier] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const activeWeek = getActiveMonday(now);
    if (activeWeek === state.planWeek) return;
    try {
      const nextPlan = createPlan(activeWeek, state.settings, state.history);
      setState((current) => ({
        ...current,
        planWeek: activeWeek,
        plan: nextPlan,
        history: [...current.history, ...nextPlan.map((day) => ({ recipeId: day.recipeId, date: day.date }))],
        shopping: buildShoppingList(nextPlan, current.shopping),
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Het nieuwe weekmenu kon niet worden samengesteld.');
    }
  }, [now, state.planWeek, state.settings, state.history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('De planner kon niet lokaal worden opgeslagen.', error);
      setNotice('Opslaan is niet gelukt. Controleer de opslagruimte van je browser.');
    }
  }, [state]);

  const today = getTodayKey(now);
  const todayPlan = state.plan.find((day) => day.date === today) ?? state.plan[0];
  const todayRecipe = recipeForDay(todayPlan);
  const plannedRecipes = state.plan.map((day) => recipeForDay(day)).filter((recipe): recipe is Recipe => Boolean(recipe));
  const todayConsumed = todayPlan?.eaten ? todayRecipe : undefined;
  const todayStats = todayConsumed?.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const visibleRecipes = useMemo(() => recipes.filter((recipe) =>
    (!favoritesOnly || state.favorites.includes(recipe.id))
    && (filter === 'Alles' || recipe.proteinType === filter)
    && `${recipe.name} ${recipe.description} ${recipe.proteinType} ${recipe.carbType}`.toLocaleLowerCase('nl-BE').includes(query.toLocaleLowerCase('nl-BE')),
  ), [filter, favoritesOnly, state.favorites, query]);

  const updateSettings = (settings: Settings) => {
    try {
      const plan = createPlan(state.planWeek, settings, state.history);
      setState((current) => ({
        ...current,
        settings,
        plan,
        history: [...current.history, ...plan.map((day) => ({ recipeId: day.recipeId, date: day.date }))],
        shopping: buildShoppingList(plan, current.shopping),
      }));
      setNotice('Je voorkeuren zijn opgeslagen en je weekmenu is bijgewerkt.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Je voorkeuren konden niet worden toegepast.');
    }
  };

  const setRecipeForDay = (date: string, recipe: Recipe) => {
    const target = state.plan.find((day) => day.date === date);
    if (!target) return;
    if (!eligibleRecipes(state.settings).some(({ id }) => id === recipe.id)) {
      setNotice('Dit recept past niet bij je ingestelde bereidingstijd, budget of uitgesloten ingrediënten.');
      return;
    }
    if (state.plan.some((day) => day.date !== date && day.recipeId === recipe.id)) {
      setNotice('Dit recept staat al op een andere dag in je weekmenu.');
      return;
    }
    const cutoff = getTodayKey(new Date(Date.now() - 30 * 86400000));
    if (target.recipeId !== recipe.id && state.history.some((entry) => entry.recipeId === recipe.id && entry.date >= cutoff)) {
      setNotice('Dit recept is de afgelopen 30 dagen al ingepland. Kies een ander gerecht.');
      return;
    }
    const next = state.plan.map((day) => day.date === date ? { ...day, recipeId: recipe.id, eaten: false } : day);
    setState((current) => ({
      ...current,
      plan: next,
      history: [...current.history, { recipeId: recipe.id, date }],
      shopping: buildShoppingList(next, current.shopping),
    }));
    setPickForDate(null);
    setSelectedRecipe(null);
    setPage(date === getTodayKey() ? 'today' : 'week');
    setNotice(`${recipe.name} staat nu op het menu voor ${days[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7].toLowerCase()}.`);
  };

  const replaceRecipe = (day: PlannedDay) => {
    const used = new Set(state.plan.filter((item) => item.date !== day.date).map((item) => item.recipeId));
    const cutoff = getTodayKey(new Date(Date.now() - 30 * 86400000));
    const recent = new Set(state.history.filter((item) => item.date >= cutoff).map((item) => item.recipeId));
    const choices = eligibleRecipes(state.settings).filter((recipe) => !used.has(recipe.id) && !recent.has(recipe.id));
    const recipe = choices[Math.floor(Math.random() * choices.length)];
    if (recipe) setRecipeForDay(day.date, recipe);
    else setNotice('Er zijn geen geschikte recepten meer beschikbaar. Pas je voorkeuren aan.');
  };

  const regenerate = () => {
    try {
      const plan = createPlan(state.planWeek, state.settings, state.history);
      setState((current) => ({
        ...current,
        plan,
        history: [...current.history, ...plan.map((day) => ({ recipeId: day.recipeId, date: day.date }))],
        shopping: buildShoppingList(plan, current.shopping),
      }));
      setNotice('Je weekmenu is opnieuw samengesteld.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Het weekmenu kon niet worden vernieuwd.');
    }
  };

  const setShoppingItem = (id: string, changes: Partial<ShoppingItem>) => {
    setState((current) => ({ ...current, shopping: current.shopping.map((item) => item.id === id ? { ...item, ...changes } : item) }));
  };

  const addShoppingItem = () => {
    const name = shoppingDraft.trim();
    if (!name) return;
    setState((current) => ({
      ...current,
      shopping: [...current.shopping, {
        id: `manual-${Date.now()}`, name, amount: 1, unit: 'stuks',
        category: 'Overige producten', checked: false, manual: true,
      }],
    }));
    setShoppingDraft('');
  };

  const copyShopping = async () => {
    const text = categories.map((category) => {
      const items = state.shopping.filter((item) => item.category === category && !(state.hiddenChecked && item.checked));
      return items.length ? `${category}\n${items.map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.name} — ${formatAmount(item.amount, item.unit)}`).join('\n')}` : '';
    }).filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Je boodschappenlijst is gekopieerd.');
    } catch (error) {
      console.error('Kopiëren is niet gelukt.', error);
      setNotice('Kopiëren is niet beschikbaar. Gebruik de afdrukknop.');
    }
  };

  const toggleEaten = (date: string) => {
    setState((current) => ({ ...current, plan: current.plan.map((day) => day.date === date ? { ...day, eaten: !day.eaten } : day) }));
  };

  const toggleFavorite = (id: string) => {
    setState((current) => ({
      ...current,
      favorites: current.favorites.includes(id) ? current.favorites.filter((favorite) => favorite !== id) : [...current.favorites, id],
    }));
  };

  const openRecipe = (recipe: Recipe, servings = 1) => {
    setServingMultiplier(servings);
    setSelectedRecipe(recipe);
  };

  const dateLabel = new Intl.DateTimeFormat('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Brussels' }).format(now);
  const weekLabel = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${state.planWeek}T00:00:00Z`));
  const navItems: { id: Page; label: string; icon: typeof Flame }[] = [
    { id: 'today', label: 'Vandaag', icon: Flame },
    { id: 'week', label: 'Weekmenu', icon: ListChecks },
    { id: 'shopping', label: 'Boodschappen', icon: ShoppingBasket },
    { id: 'recipes', label: 'Recepten', icon: BookOpen },
    { id: 'settings', label: 'Instellingen', icon: Settings2 },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('today'); }}>
          <span className="brand-mark"><Leaf size={21} /></span><span>dagroen<span className="brand-dot">.</span></span>
        </a>
        <div className="sidebar-label">MENU</div>
        <nav className="main-nav" aria-label="Hoofdnavigatie">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === 'shopping' && <span className="nav-count">{state.shopping.filter((item) => !item.checked).length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon"><Sparkles size={17} /></span>
          <strong>Goed bezig!</strong>
          <p>Elke kleine keuze brengt je dichter bij je doelen.</p>
        </div>
        <div className="sidebar-footer"><span className="status-dot" /> Alles wordt privé opgeslagen op dit apparaat</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Leaf size={19} /></span>dagroen<span className="brand-dot">.</span></div>
          <div className="top-date"><span className="date-dot" /> {dateLabel}</div>
          <button className="profile-button" onClick={() => setPage('settings')} aria-label="Open instellingen">
            <span className="avatar">S</span><span className="profile-label">Mijn profiel</span><ChevronDown size={15} />
          </button>
        </header>

        <div className="page-content">
          {page === 'today' && (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow">JOUW DAGELIJKSE INSPIRATIE</p><h1>Goedemorgen<span className="green-period">.</span></h1><p className="subheading">Een goede dag begint met iets lekkers op je bord.</p></div>
                <button className="button button-outline" onClick={() => setPage('week')}><ListChecks size={16} /> Bekijk weekmenu</button>
              </section>
              {todayRecipe ? (
                <section className="hero-card">
                  <img className="hero-image" src={todayRecipe.image} alt={todayRecipe.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                  <div className="hero-shade" />
                  <div className="hero-content">
                    <span className="hero-tag"><Sparkles size={13} /> VANDAAG OP HET MENU</span>
                    <h2>{todayRecipe.name}</h2><p>{todayRecipe.description}</p>
                    <div className="hero-meta"><span><Clock3 size={15} /> {todayRecipe.time} min</span><span><Users size={15} /> {todayPlan.servings} personen</span><span><Flame size={15} /> {todayRecipe.nutrition.calories} kcal</span></div>
                    <div className="hero-actions"><button className="button button-primary" onClick={() => openRecipe(todayRecipe, todayPlan.servings)}>Bekijk recept <ArrowRight size={16} /></button><button className="button button-glass" onClick={() => replaceRecipe(todayPlan)}><RefreshCw size={15} /> Vervang recept</button><button className="button button-glass" onClick={() => { setPickForDate(todayPlan.date); setPage('recipes'); }}><BookOpen size={15} /> Kies zelf</button><button className={`icon-button favorite-hero ${state.favorites.includes(todayRecipe.id) ? 'favorited' : ''}`} onClick={() => toggleFavorite(todayRecipe.id)} aria-label="Favoriet"><Heart size={18} fill={state.favorites.includes(todayRecipe.id) ? 'currentColor' : 'none'} /></button></div>
                  </div>
                  <span className="hero-index">01 <span>/ 07</span></span>
                </section>
              ) : <div className="empty-card">Geen gerecht gevonden voor vandaag. Controleer je instellingen.</div>}

              <section className="stats-grid">
                <article className="stat-card"><div className="stat-icon calories-icon"><Flame size={17} /></div><div className="stat-title">Calorieën vandaag</div><div className="stat-value">{todayStats.calories.toLocaleString('nl-BE')} <small>kcal</small></div><div className="progress-track"><span style={{ width: `${Math.min(todayStats.calories / state.settings.calorieGoal * 100, 100)}%` }} /></div><div className="stat-foot">{state.settings.calorieGoal - todayStats.calories} kcal tot je doel</div></article>
                <article className="stat-card"><div className="stat-icon protein-icon"><Leaf size={17} /></div><div className="stat-title">Eiwitten vandaag</div><div className="stat-value">{todayStats.protein}<small> g</small></div><div className="progress-track protein-track"><span style={{ width: `${Math.min(todayStats.protein / state.settings.proteinGoal * 100, 100)}%` }} /></div><div className="stat-foot">{Math.max(0, state.settings.proteinGoal - todayStats.protein)} g tot je doel</div></article>
                <article className="stat-card daily-check-card"><div className="stat-icon check-icon"><CheckCircle2 size={17} /></div><div className="stat-title">Maaltijdtracker</div><div className="check-copy">{todayPlan?.eaten ? 'Maaltijd afgevinkt' : 'Heb je dit gerecht gegeten?'}</div><button className={`check-meal ${todayPlan?.eaten ? 'checked' : ''}`} onClick={() => todayPlan && toggleEaten(todayPlan.date)}><Check size={15} /> {todayPlan?.eaten ? 'Ongedaan maken' : 'Ja, afvinken'}</button></article>
              </section>

              <section className="section-block">
                <div className="section-heading"><div><p className="eyebrow">DEZE WEEK</p><h2>Op het menu</h2></div><button className="text-button" onClick={() => setPage('week')}>Volledige planning <ArrowRight size={15} /></button></div>
                <div className="mini-week">
                  {state.plan.map((day, index) => {
                    const recipe = recipeForDay(day);
                    return <button className={`mini-day ${day.date === today ? 'current' : ''}`} key={day.date} onClick={() => recipe && openRecipe(recipe, day.servings)}>
                      <span className="mini-weekday">{days[index].slice(0, 3)}</span>
                      <img src={recipe?.image ?? fallbackImage} alt="" onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                      <span className="mini-name">{recipe?.name}</span><span className="mini-time"><Clock3 size={12} /> {recipe?.time} min</span>
                    </button>;
                  })}
                </div>
              </section>
            </>
          )}

          {page === 'week' && (
            <>
              <section className="page-title-row"><div><p className="eyebrow">JOUW PLANNING</p><h1>Weekmenu<span className="green-period">.</span></h1><p className="subheading">Week van {weekLabel} · automatisch vernieuwd op maandag om 06:00</p></div><button className="button button-outline" onClick={regenerate}><RefreshCw size={16} /> Nieuw weekmenu</button></section>
              <section className="week-summary">
                <div><span className="summary-icon"><ChefHat size={17} /></span><span><strong>7 gevarieerde maaltijden</strong><small>Geen dubbele gerechten deze week</small></span></div>
                <div><span className="summary-icon"><Flame size={17} /></span><span><strong>{Math.round(plannedRecipes.reduce((sum, recipe) => sum + recipe.nutrition.calories, 0) / 7)} kcal</strong><small>Gemiddeld per hoofdmaaltijd</small></span></div>
                <button className="button button-primary" onClick={() => setPage('shopping')}><ShoppingBasket size={16} /> Boodschappenlijst</button>
              </section>
              <section className="week-list">
                {state.plan.map((day, index) => {
                  const recipe = recipeForDay(day);
                  return recipe && <article className={`week-card ${day.date === today ? 'week-card-today' : ''}`} key={day.date}>
                    <div className="week-day-label"><span>{days[index]}</span><small>{new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T00:00:00Z`))}</small>{day.date === today && <em>VANDAAG</em>}</div>
                    <button className="week-recipe" onClick={() => openRecipe(recipe, day.servings)}><img src={recipe.image} alt="" onError={(event) => { event.currentTarget.src = fallbackImage; }} /><span><strong>{recipe.name}</strong><small><Clock3 size={13} /> {recipe.time} min <i>·</i> {recipe.nutrition.calories} kcal <i>·</i> {recipe.nutrition.protein} g eiwit <i>·</i> €{recipe.price.toFixed(2)} / portie</small></span></button>
                    <div className="week-actions"><button className={`tiny-icon ${day.eaten ? 'eaten' : ''}`} aria-label={day.eaten ? 'Maaltijd afgevinkt' : 'Maaltijd afvinken'} onClick={() => toggleEaten(day.date)}><Check size={16} /></button><button className="tiny-icon" aria-label="Recept vervangen" onClick={() => replaceRecipe(day)}><RefreshCw size={15} /></button><button className="tiny-icon" aria-label="Kies recept" onClick={() => { setPickForDate(day.date); setPage('recipes'); }}><ArrowRight size={16} /></button></div>
                  </article>;
                })}
              </section>
            </>
          )}

          {page === 'shopping' && (
            <>
              <section className="page-title-row"><div><p className="eyebrow">ALLES IN ÉÉN OVERZICHT</p><h1>Boodschappen<span className="green-period">.</span></h1><p className="subheading">Samengesteld uit jouw zeven recepten voor deze week.</p></div><div className="title-actions"><button className="button button-outline" onClick={copyShopping}><Copy size={15} /> Kopieer</button><button className="button button-primary print-button" onClick={() => window.print()}><Printer size={15} /> Afdrukken</button></div></section>
              <div className="shopping-toolbar"><span><strong>{state.shopping.filter((item) => !item.checked).length}</strong> producten te halen</span><label className="toggle-label"><input type="checkbox" checked={state.hiddenChecked} onChange={(event) => setState((current) => ({ ...current, hiddenChecked: event.target.checked }))} /> Verberg afgevinkt</label></div>
              <div className="shopping-add"><Plus size={17} /><input value={shoppingDraft} onChange={(event) => setShoppingDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addShoppingItem(); }} placeholder="Voeg zelf een product toe..." /><button className="button button-primary" onClick={addShoppingItem}>Toevoegen</button></div>
              <div className="shopping-categories">
                {categories.map((category) => {
                  const items = state.shopping.filter((item) => item.category === category && !(state.hiddenChecked && item.checked));
                  if (!items.length) return null;
                  return <section className="shopping-category" key={category}><h2>{category}<span>{items.length}</span></h2>
                    {items.map((item) => <div className={`shopping-row ${item.checked ? 'is-checked' : ''}`} key={item.id}>
                      <label className="check-label"><input type="checkbox" checked={item.checked} onChange={(event) => setShoppingItem(item.id, { checked: event.target.checked })} /><span className="custom-check"><Check size={13} /></span><span className="item-name">{item.name}</span></label>
                      <div className="item-controls"><input aria-label={`Hoeveelheid ${item.name}`} type="number" min="0" step="0.1" value={item.amount} onChange={(event) => setShoppingItem(item.id, { amount: Number(event.target.value) })} /><select aria-label={`Eenheid ${item.name}`} value={item.unit} onChange={(event) => setShoppingItem(item.id, { unit: event.target.value as ShoppingItem['unit'] })}><option value="g">g</option><option value="ml">ml</option><option value="stuks">stuks</option></select><button className="tiny-icon delete-item" aria-label={`Verwijder ${item.name}`} onClick={() => setState((current) => ({ ...current, shopping: current.shopping.filter(({ id }) => id !== item.id) }))}><Trash2 size={15} /></button></div>
                    </div>)}
                  </section>;
                })}
                {!state.shopping.length && <div className="empty-card">Je boodschappenlijst is nog leeg.</div>}
              </div>
            </>
          )}

          {page === 'recipes' && (
            <>
              <section className="page-title-row"><div><p className="eyebrow">ONTDEK IETS LEKKERS</p><h1>{pickForDate ? 'Kies een recept' : 'Recepten'}<span className="green-period">.</span></h1><p className="subheading">{pickForDate ? 'Tik op een gerecht om het aan je planning toe te voegen.' : `${recipes.length} eiwitrijke gerechten, passend bij jouw week.`}</p></div>{pickForDate && <button className="button button-outline" onClick={() => { setPickForDate(null); setPage('week'); }}><ArrowLeft size={15} /> Terug naar weekmenu</button>}</section>
              <div className="recipe-filters"><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek op gerecht of ingrediënt..." /></label><div className="filter-scroll"><SlidersHorizontal size={16} /><button className={`filter-chip ${favoritesOnly ? 'selected' : ''}`} onClick={() => setFavoritesOnly((value) => !value)}>Favorieten ({state.favorites.length})</button>{filters.map((item) => <button key={item} className={`filter-chip ${filter === item ? 'selected' : ''}`} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
              <div className="recipe-grid">
                {visibleRecipes.map((recipe) => <article className="recipe-card" key={recipe.id}>
                  <button className="recipe-image-button" onClick={() => pickForDate ? setRecipeForDay(pickForDate, recipe) : openRecipe(recipe)}><img src={recipe.image} alt={recipe.name} loading="lazy" onError={(event) => { event.currentTarget.src = fallbackImage; }} /><span className="recipe-time"><Clock3 size={13} /> {recipe.time} min</span></button>
                  <div className="recipe-card-body"><div className="recipe-tag-row"><span>{recipe.proteinType}</span><button className={`heart-button ${state.favorites.includes(recipe.id) ? 'favorited' : ''}`} aria-label="Favoriet" onClick={() => toggleFavorite(recipe.id)}><Heart size={17} fill={state.favorites.includes(recipe.id) ? 'currentColor' : 'none'} /></button></div><button className="recipe-card-title" onClick={() => pickForDate ? setRecipeForDay(pickForDate, recipe) : openRecipe(recipe)}>{recipe.name}</button><p>{recipe.description}</p><div className="recipe-card-meta"><span><Leaf size={14} /> {recipe.nutrition.protein} g eiwit</span><span>€{recipe.price.toFixed(2)}</span></div></div>
                </article>)}
                {!visibleRecipes.length && <div className="empty-card">Geen recepten gevonden. Pas je zoekterm of filter aan.</div>}
              </div>
            </>
          )}

          {page === 'settings' && <SettingsPage settings={state.settings} favoriteCount={state.favorites.length} onSave={updateSettings} onFavorites={() => { setFavoritesOnly(true); setFilter('Alles'); setQuery(''); setPage('recipes'); }} />}
        </div>
      </main>

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Melding sluiten"><X size={15} /></button></div>}

      {selectedRecipe && <RecipeModal recipe={selectedRecipe} baseServings={servingMultiplier} favorite={state.favorites.includes(selectedRecipe.id)} onClose={() => setSelectedRecipe(null)} onFavorite={() => toggleFavorite(selectedRecipe.id)} />}
    </div>
  );
}

function SettingsPage({ settings, favoriteCount, onSave, onFavorites }: { settings: Settings; favoriteCount: number; onSave: (settings: Settings) => void; onFavorites: () => void }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  const excludedText = draft.excluded.join(', ');
  const updateExcluded = (text: string) => setDraft((current) => ({ ...current, excluded: text.split(',').map((item) => item.trim()).filter(Boolean) }));
  return <section className="settings-page">
    <div className="page-title-row"><div><p className="eyebrow">OP JOUW MAAT GEMAAKT</p><h1>Instellingen<span className="green-period">.</span></h1><p className="subheading">Stel je doelen en voorkeuren in voor een menu dat bij je past.</p></div></div>
    <div className="settings-layout">
      <div className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><Flame size={18} /></span><div><h2>Dagelijkse doelen</h2><p>Jouw richtlijnen voor voeding en porties.</p></div></div>
        <label className="form-field"><span>Caloriedoel <small>kcal per dag</small></span><input type="number" min="800" max="6000" value={draft.calorieGoal} onChange={(event) => setDraft({ ...draft, calorieGoal: Number(event.target.value) })} /></label>
        <label className="form-field"><span>Eiwitdoel <small>gram per dag</small></span><input type="number" min="20" max="400" value={draft.proteinGoal} onChange={(event) => setDraft({ ...draft, proteinGoal: Number(event.target.value) })} /></label>
        <label className="form-field"><span>Aantal personen</span><select value={draft.servings} onChange={(event) => setDraft({ ...draft, servings: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'persoon' : 'personen'}</option>)}</select></label>
      </div>
      <div className="settings-card"><div className="settings-card-heading"><span className="settings-icon green-setting"><SlidersHorizontal size={18} /></span><div><h2>Jouw voorkeuren</h2><p>We gebruiken dit om je weekmenu samen te stellen.</p></div></div>
        <label className="form-field"><span>Budgetvoorkeur</span><select value={draft.budget} onChange={(event) => setDraft({ ...draft, budget: event.target.value as Settings['budget'] })}><option value="budget">Budgetvriendelijk</option><option value="standard">Geen voorkeur</option></select></label>
        <label className="form-field"><span>Maximale bereidingstijd <small>minuten</small></span><select value={draft.maxTime} onChange={(event) => setDraft({ ...draft, maxTime: Number(event.target.value) })}><option value={25}>25 minuten</option><option value={30}>30 minuten</option><option value={40}>40 minuten</option><option value={60}>60 minuten</option></select></label>
        <label className="form-field column-field"><span>Allergieën of uitgesloten ingrediënten <small>scheid met komma's</small></span><input value={excludedText} onChange={(event) => updateExcluded(event.target.value)} placeholder="bv. melk, gluten, champignons" /></label>
      </div>
      <div className="settings-card settings-action-card"><div className="settings-card-heading"><span className="settings-icon favorite-setting"><Heart size={18} /></span><div><h2>Jouw favorieten</h2><p>Je hebt {favoriteCount} recepten bewaard.</p></div></div><button className="button button-outline" onClick={onFavorites}>Bekijk favorieten <ArrowRight size={15} /></button><button className="button button-primary save-settings" onClick={() => onSave(draft)}>Voorkeuren opslaan <Check size={16} /></button></div>
      <div className="privacy-note"><span className="status-dot" /><span><strong>Jouw gegevens blijven van jou.</strong> Alles wordt lokaal in je browser bewaard. Er worden geen accounts of betaalde diensten gebruikt.</span></div>
    </div>
  </section>;
}

function RecipeModal({ recipe, baseServings, favorite, onClose, onFavorite }: { recipe: Recipe; baseServings: number; favorite: boolean; onClose: () => void; onFavorite: () => void }) {
  const [servings, setServings] = useState(baseServings);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    document.body.classList.add('modal-open');
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.classList.remove('modal-open'); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-image-wrap"><img src={recipe.image} alt={recipe.name} onError={(event) => { event.currentTarget.src = fallbackImage; }} /><button className="modal-close" onClick={onClose} aria-label="Sluiten"><X size={19} /></button><span className="modal-image-tag"><Clock3 size={14} /> {recipe.time} min</span></div>
      <div className="modal-content"><div className="modal-title-row"><div><span className="eyebrow">{recipe.proteinType.toUpperCase()} · {recipe.difficulty.toUpperCase()}</span><h2 id="modal-title">{recipe.name}</h2></div><button className={`heart-button modal-heart ${favorite ? 'favorited' : ''}`} onClick={onFavorite} aria-label="Bewaar als favoriet"><Heart size={20} fill={favorite ? 'currentColor' : 'none'} /></button></div>
        <p className="modal-description">{recipe.description}</p>
        <div className="nutrition-strip"><div><strong>{recipe.nutrition.calories}</strong><span>kcal</span></div><div><strong>{recipe.nutrition.protein} g</strong><span>eiwitten</span></div><div><strong>{recipe.nutrition.carbs} g</strong><span>koolhydraten</span></div><div><strong>{recipe.nutrition.fat} g</strong><span>vetten</span></div><div><strong>€{(recipe.price * servings).toFixed(2)}</strong><span>geschat totaal</span></div></div>
        <div className="servings-control"><h3>Ingrediënten</h3><div><Users size={15} /><button onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Minder personen">−</button><strong>{servings}</strong><button onClick={() => setServings(Math.min(12, servings + 1))} aria-label="Meer personen">+</button><span>personen</span></div></div>
        <ul className="ingredient-list">{recipe.ingredients.map((ingredient) => <li key={`${ingredient.name}-${ingredient.unit}`}><span>{ingredient.name}</span><strong>{formatAmount(ingredient.amount * servings, ingredient.unit)}</strong></li>)}</ul>
        <h3 className="method-heading">Zo maak je het</h3><ol className="method-list">{recipe.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
        <div className="modal-footer"><span><strong>Allergenen:</strong> {recipe.allergens.length ? recipe.allergens.join(', ') : 'geen bekende allergenen'}</span><span><Users size={14} /> {servings} {servings === 1 ? 'persoon' : 'personen'}</span></div>
      </div>
    </article>
  </div>;
}

export default App;
