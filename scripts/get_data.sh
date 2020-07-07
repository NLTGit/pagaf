
get_uscensus_county() {
  pushd rawdata
  curl -O https://www2.census.gov/geo/tiger/TIGER2019/COUNTY/tl_2019_us_county.zip
  popd
}

set_projections() {
   pushd data/CLU/ia
   for i in *shp; do
       ogr2ogr -f "ESRI Shapefile" -a_srs EPSG:32615 prj/${i} ${i}
   done
   popd
}