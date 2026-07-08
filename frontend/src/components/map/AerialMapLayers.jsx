import React from 'react';
import PropTypes from 'prop-types';
import { TileLayer } from 'react-leaflet';
import { AERIAL_LABELS, AERIAL_TILES, STREET_TILES } from '../../utils/mapTiles';

function AerialMapLayers({ aerial = false }) {
  if (!aerial) {
    return (
      <TileLayer
        attribution={STREET_TILES.attribution}
        url={STREET_TILES.url}
        maxZoom={STREET_TILES.maxZoom}
      />
    );
  }

  return (
    <>
      <TileLayer
        attribution={AERIAL_TILES.attribution}
        url={AERIAL_TILES.url}
        maxZoom={AERIAL_TILES.maxZoom}
      />
      <TileLayer
        url={AERIAL_LABELS.url}
        maxZoom={AERIAL_LABELS.maxZoom}
        opacity={0.85}
        pane="overlayPane"
      />
    </>
  );
}

AerialMapLayers.propTypes = {
  aerial: PropTypes.bool,
};

export default AerialMapLayers;
