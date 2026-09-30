"use client";

import { Map as MapIcon } from "lucide-react";
import type { GeographicData } from "@/services/analyticsService";
import { aggregateListenersByRegion, type MapRegion, type RegionTotal } from "@/utils/artistPortal";

interface ListenerMapProps {
  data: GeographicData[];
}

/** Tile positions on a simplified 4×3 world grid. */
const TILE_POSITION: Record<MapRegion, string> = {
  "North America": "col-start-1 row-start-1",
  "South America": "col-start-1 row-start-3",
  Europe: "col-start-2 row-start-1",
  Africa: "col-start-2 row-start-2",
  Asia: "col-start-3 row-start-1",
  Oceania: "col-start-4 row-start-3",
};

const INTENSITY_CLASS: Record<RegionTotal["intensity"], string> = {
  0: "bg-[#2d3d2d] text-gray-500",
  1: "bg-pink-500/20 text-white",
  2: "bg-pink-500/40 text-white",
  3: "bg-pink-500/70 text-white",
  4: "bg-pink-500 text-white",
};

export default function ListenerMap({ data }: ListenerMapProps) {
  const regions = aggregateListenersByRegion(data);

  return (
    <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapIcon size={20} className="text-pink-500" aria-hidden="true" />
        <h2 className="text-white text-lg font-semibold">Listener Map</h2>
      </div>

      <div
        className="grid grid-cols-4 grid-rows-3 gap-2"
        role="img"
        aria-label="Listeners by world region"
      >
        {regions.map((r) => (
          <div
            key={r.region}
            className={`${TILE_POSITION[r.region]} ${INTENSITY_CLASS[r.intensity]} rounded-md p-3 min-h-16`}
            title={r.countries.join(", ") || "No listeners yet"}
            data-intensity={r.intensity}
          >
            <p className="text-xs font-semibold">{r.region}</p>
            <p className="text-sm">{r.share.toFixed(0)}%</p>
          </div>
        ))}
      </div>

      {/* Accessible, screen-reader friendly equivalent of the map. */}
      <table className="sr-only">
        <caption>Plays by region</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Plays</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr key={r.region}>
              <th scope="row">{r.region}</th>
              <td>{r.plays.toLocaleString()}</td>
              <td>{r.share.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { ListenerMap };
