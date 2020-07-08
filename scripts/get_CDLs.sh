#!/bin/bash

set -e
pushd rawdata
mkdir -p CDL | :

pushd CDL
for yr in 2019 2018 2017 2016 2015 2014 2013 2012 2011 2010 2009 2008 2007 2006 2006; do
    curl -O https://www.nass.usda.gov/Research_and_Science/Cropland/docs/US_${yr}_CDL_legend.jpg
    curl -O https://www.nass.usda.gov/Research_and_Science/Cropland/docs/cdl_legends_${yr}.zip
    curl -O https://www.nass.usda.gov/Research_and_Science/Cropland/docs/CropScape_${yr}_Stats.xlsx
done

curl -O ftp://ftp.nass.usda.gov/download/res/2019_30m_confidence_layer.zip
curl -O ftp://ftp.nass.usda.gov/download/res/2018_30m_confidence_layer.zip

curl -O ftp://ftp.nass.usda.gov/download/res/2019_30m_cdls.zip
curl -O ftp://ftp.nass.usda.gov/download/res/2018_30m_cdls.zip
curl -O ftp://ftp.nass.usda.gov/download/res/2017_30m_cdls.zip

popd


