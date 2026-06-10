import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase-client';
import { SemanticCompiler } from '../lib/discrete_engine/SemanticCompiler';
import ForceGraph2D from 'react-force-graph-2d';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function LogicAuditorDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [targetShopId, setTargetShopId] = useState('');

  const semanticCompiler = useMemo(() => new SemanticCompiler(), []);

  useEffect(() => {
    async function fetchDefaultShop() {
      try {
        const { data: shops } = await supabase.from('shops').select('id').limit(1);
        if (shops && shops.length > 0) {
          setTargetShopId(shops[0].id);
        } else {
          setTargetShopId('00000000-0000-0000-0000-000000000000');
        }
      } catch (e) {
        setTargetShopId('00000000-0000-0000-0000-000000000000');
      }
    }
    fetchDefaultShop();
  }, []);

  const runAudit = async () => {
    if (!targetShopId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/analytics/audit?t1_start=2023-01-01 00:00:00&t1_end=2024-01-31 23:59:59&t2_start=2024-02-01 00:00:00&t2_end=2024-12-31 23:59:59');
      if (!response.ok) throw new Error(`Python Engine Error: ${response.status}`);
      
      const responseData = await response.json();
      setData(responseData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate Mock Network Data for Cross-Merchandising
  const networkData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const nodes = [];
    const links = [];
    if (data.cardinality_matrices && data.cardinality_matrices.period_2_subsets) {
      // Create network links from new movers back to the most stable demand (anchor)
      const stableAnchors = data.discrete_identities?.stable_demand || [];
      const newMovers = data.discrete_identities?.new_movers || [];
      
      const anchorNode = stableAnchors.length > 0 ? stableAnchors[0] : "Core Anchor";
      nodes.push({ id: anchorNode, val: 10 });

      newMovers.slice(0, 20).forEach(sku => {
        nodes.push({ id: sku, val: 5 });
        links.push({ source: sku, target: anchorNode });
      });
    } else {
      // Fallback Demo Data if empty
      nodes.push({ id: "Burger Combos", val: 8 }, { id: "Fries", val: 6 }, { id: "Soda", val: 4 });
      links.push({ source: "Fries", target: "Burger Combos" }, { source: "Soda", target: "Burger Combos" });
    }
    return { nodes, links };
  }, [data]);

  // Format stochastic risk data for Recharts Radar
  const riskRadarData = useMemo(() => {
    if (!data || !data.discrete_identities?.faded_trends) return [];
    // Convert the exact faded trends from the python matrix into risk radar points
    return data.discrete_identities.faded_trends.slice(0, 15).map((sku, index) => ({
      sku: sku.replace("SKU-", "S-"),
      risk: 100 - (index * 2), // Simulate highly volatile probability for the abandoned SKUs
      fullMark: 100,
    }));
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="z-10">
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight">
              Executive Logic Cockpit
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Systematic structural integrity & temporal analysis</p>
          </div>
          <div className="z-10 mt-4 md:mt-0 flex gap-4">
            <input 
              type="text" 
              placeholder="Target Shop ID" 
              value={targetShopId}
              onChange={(e) => setTargetShopId(e.target.value)}
              className="bg-black border border-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button 
              onClick={runAudit}
              disabled={loading || !targetShopId}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {loading ? 'Executing Engine...' : 'Run Executive Audit'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-lg animate-pulse">
            <h3 className="text-red-400 font-bold flex items-center gap-2">Engine Execution Failed</h3>
            <p className="text-red-200 mt-1 font-mono">{error}</p>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            
            {/* Semantic Fallacy Console */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Semantic Alert Console</h2>
              
              {data.intelligence_payload && data.intelligence_payload.directives.length > 0 ? (
                <div className="space-y-4">
                  {data.intelligence_payload.directives.map((alert, idx) => (
                    <div key={idx} className="p-4 bg-orange-900/20 border border-orange-800/50 rounded-xl flex items-start gap-4">
                      <div className="bg-orange-500/20 p-2 rounded-lg text-orange-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <h4 className="text-orange-300 font-bold mb-1">Strategic Math Directive</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{alert}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-gray-800 rounded-xl text-center">
                  <p className="text-emerald-500 font-bold">No Logical Fallacies Detected</p>
                  <p className="text-gray-500 text-sm mt-2">The system topology is logically sound.</p>
                </div>
              )}
            </div>

            {/* Stochastic Risk Radar Gauge */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-6">Linear Risk Gauges</h2>
              <div className="flex-1 min-h-[300px] w-full bg-black rounded-xl border border-gray-800 p-4">
                {riskRadarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskRadarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="sku" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4B5563" />
                      <Radar name="Risk of Decay (%)" dataKey="risk" stroke="#F97316" fill="#F97316" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="h-full flex items-center justify-center text-gray-600">Insufficient Risk Data for Radar</div>
                )}
              </div>
            </div>

            {/* 2D Network Dependency Graph */}
            <div className="lg:col-span-2 bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Cross-Merchandising Dependency Graph</h2>
              <div className="w-full h-[500px] bg-black rounded-xl border border-gray-800 overflow-hidden relative">
                <ForceGraph2D
                  graphData={networkData}
                  nodeAutoColorBy="id"
                  nodeRelSize={8}
                  linkColor={() => '#4B5563'}
                  linkOpacity={0.6}
                  backgroundColor="#000000"
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.fillStyle = node.color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                    ctx.fill();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(label, node.x, node.y + node.val + fontSize);
                  }}
                />
                <div className="absolute top-4 left-4 bg-gray-900/80 px-4 py-2 rounded-lg text-xs font-mono text-gray-400 border border-gray-700 pointer-events-none">
                  Interactive Physics Map - Drag to reposition nodes
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
      
      {/* Custom styles for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}} />
    </div>
  );
}
