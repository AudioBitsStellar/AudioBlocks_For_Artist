import type { Translations } from "./en";

const es: Translations = {
  nav: {
    dashboard: "Panel",
    myMusic: "Mi Música",
    analytics: "Analíticas",
    events: "Eventos",
    merch: "Mercancía",
    profile: "Perfil",
    settings: "Configuración",
    uploadMusic: "Subir Música",
  },

  header: {
    welcome: "Bienvenido",
    search: "Buscar artistas, canciones o álbumes",
    searchMobile: "Buscar artistas, canciones o álbumes",
    notifications: "Notificaciones y ajustes",
    switchToLight: "Cambiar a modo claro",
    switchToDark: "Cambiar a modo oscuro",
    goToProfile: "Ir al perfil",
    openMenu: "Abrir menú de navegación",
  },

  auth: {
    login: "Iniciar sesión",
    signup: "Registrarse",
    logout: "Cerrar sesión",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    noAccount: "¿No tienes una cuenta?",
    hasAccount: "¿Ya tienes una cuenta?",
  },

  music: {
    myAlbums: "Mis Álbumes",
    noAlbums: "Aún no tienes álbumes",
    noAlbumsDescription: "Crea tu primer álbum para organizar y mostrar tu colección de música.",
    deleteAlbum: "Eliminar álbum",
    viewAll: "Ver todos los álbumes",
    scrollLeft: "Desplazar álbumes a la izquierda",
    scrollRight: "Desplazar álbumes a la derecha",
    noCover: "Sin Portada",

    // Metadata and multilingual content
    metadata: {
      title: "Título",
      titlePlaceholder: "Ingresa título de canción/álbum",
      description: "Descripción",
      descriptionPlaceholder: "Describe tu música",
      genre: "Género",
      genrePlaceholder: "Ingresa género",
      releaseDate: "Fecha de Lanzamiento",
      releaseDatePlaceholder: "Selecciona fecha de lanzamiento",
      artist: "Artista",
      artistPlaceholder: "Nombre del artista",
      album: "Álbum",
      albumPlaceholder: "Nombre del álbum",
      lyrics: "Letras",
      lyricsPlaceholder: "Ingresa letras de la canción",
      tags: "Etiquetas",
      tagsPlaceholder: "Añade etiquetas (separadas por comas)",
    },
  },

  actions: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    submit: "Enviar",
    confirm: "Confirmar",
    close: "Cerrar",
    back: "Atrás",
    next: "Siguiente",
    upload: "Subir",
  },

  status: {
    loading: "Cargando…",
    error: "Algo salió mal. Por favor, inténtalo de nuevo.",
    noData: "No hay datos disponibles.",
    success: "¡Listo!",
    offline: "Estás sin conexión. Algunas funciones pueden no estar disponibles.",
  },

  language: {
    label: "Idioma",
    en: "English",
    es: "Español",
  },

  // Fan Rewards & Loyalty Program
  rewards: {
    title: "Programa de Lealtad",
    yourPoints: "Tus Puntos",
    currentTier: "Nivel Actual",
    earnMorePoints: "Gana Más Puntos",
    redeemRewards: "Canjear Recompensas",
    exclusiveContent: "Contenido Exclusivo",
    unlockedContent: "Contenido Desbloqueado",
    lockedContent: "Contenido Bloqueado",

    // Point sources
    pointsPerStream: "Puntos por transmisión",
    pointsPerPurchase: "Puntos por compra",
    pointsPerShare: "Puntos por compartición",
    pointsPerReview: "Puntos por reseña",
    pointsPerEvent: "Puntos por asistencia a evento",
    referralBonus: "Bonificación por referencia",

    // Tiers
    tiers: {
      bronze: "Bronce",
      silver: "Plata",
      gold: "Oro",
      platinum: "Platino",
    },

    // Actions
    unlock: "Desbloquear",
    redeem: "Canjear",
    share: "Compartir",
    viewDetails: "Ver Detalles",
    unlockNow: "Desbloquear Ahora",
    redeemNow: "Canjear Ahora",

    // Messages
    needMorePoints: "Necesitas {points} puntos más para desbloquear esto",
    pointsExpire: "Los puntos expiran el {date}",
    congratulations: "¡Felicitaciones!",
    newTierUnlocked: "¡Has desbloqueado el nivel {tier}!",
    rewardRedeemed: "Recompensa canjeada exitosamente",
    noRewards: "Sin recompensas disponibles",
    noExclusiveContent: "Vuelve pronto para contenido exclusivo",
  },
};

export default es;
