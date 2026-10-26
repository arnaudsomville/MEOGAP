# Land References

## FVC

### Google Earth Engine Open-Source Code for Land Surface Temperature Estimation from the Landsat Series

- **Authors:** Sofia L. Ermida, Patrícia Soares, Vasco Mantas, Frank-M. Göttsche, Isabel F. Trigo
- **Year:** 2020
- **Journal:** Remote Sensing, 12(9), 1471
- **DOI:** [10.3390/rs12091471](https://doi.org/10.3390/rs12091471)
- **Description:** Derives fractional vegetation cover (FVC) from NDVI using `FVC = (NDVI - NDVI_bare) / (NDVI_veg - NDVI_bare)` with `NDVI_bare = 0.2` and `NDVI_veg = 0.86`, and uses FVC to adjust ASTER/Landsat emissivity in the LST retrieval.
- **Notes/limitations:** This is an LST retrieval paper where FVC is discussed and used; it is not a dedicated FVC product algorithm. The FVC relationship is empirical and tied to the paper's emissivity assumptions.

## LST

### Google Earth Engine Open-Source Code for Land Surface Temperature Estimation from the Landsat Series

- **Authors:** Sofia L. Ermida, Patrícia Soares, Vasco Mantas, Frank-M. Göttsche, Isabel F. Trigo
- **Year:** 2020
- **Journal:** Remote Sensing, 12(9), 1471
- **DOI:** [10.3390/rs12091471](https://doi.org/10.3390/rs12091471)
- **Description:** Open-source Google Earth Engine implementation of physical Landsat 4/5/7/8 LST retrieval, using ASTER GED emissivity, an NDVI/FVC-based emissivity correction and atmospheric inputs.
- **Notes/limitations:** Physical retrieval with prescribed emissivity and atmospheric inputs; results require validation against reference LST products and explicit uncertainty and coverage reporting.

**See also:** He et al. (2024) uses LST as a predictor for ground-level ozone; see the Ozone section.

## Ozone

### Unraveling the Influence of Satellite-Observed Land Surface Temperature on High-Resolution Mapping of Ground-Level Ozone Using Interpretable Machine Learning

- **Authors:** Qingqing He, Jingru Cao, Pablo E. Saide, Tong Ye, Weihang Wang
- **Year:** 2024
- **Journal:** Environmental Science & Technology, 58(36), 15938–15948
- **DOI:** [10.1021/acs.est.4c02926](https://doi.org/10.1021/acs.est.4c02926)
- **Description:** XGBoost and SHAP estimation of daily 1 km ground-level ozone (MDA8) using satellite LST as the primary predictor, combined with meteorology, pollutants, land cover, DEM and ground-station observations for China in 2019.
- **Notes/limitations:** Statistical proxy, not a direct measurement. Representative ground-station labels and spatial and temporal validation are required. Reported spatial cross-validation R² = 0.86 versus temporal cross-validation R² = 0.66; extreme values may be underestimated; no health or causal claims.
