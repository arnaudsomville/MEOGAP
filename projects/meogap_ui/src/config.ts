/**
 * User-facing geospatial policy values.
 *
 * Keep limits here rather than embedding them in components so they can be
 * reviewed and adjusted independently from the map and request UI.
 */
export const AOI_MAX_AREA_KM2 = 100

export const AOI_AREA_LIMIT_MESSAGE = `An AOI cannot exceed ${AOI_MAX_AREA_KM2} km². Reduce the boundary before saving.`
