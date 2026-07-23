function matchesWhere(row, where = {}) {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) return true;
    
    // Match OR clauses
    if (key === 'OR' && Array.isArray(expected)) {
      return expected.some(clause => matchesWhere(row, clause));
    }
    
    if (expected && typeof expected === 'object') {
      if ('not' in expected) {
        return row[key] !== expected.not;
      }
      if ('in' in expected) {
        return expected.in.includes(row[key]);
      }
      if ('contains' in expected) {
        const val = row[key] || '';
        const search = expected.contains || '';
        if (expected.mode === 'insensitive') {
          return val.toLowerCase().includes(search.toLowerCase());
        }
        return val.includes(search);
      }
      if ('gte' in expected) {
        return row[key] >= expected.gte;
      }
      if ('lte' in expected) {
        return row[key] <= expected.lte;
      }
    }
    return row[key] === expected;
  });
}

function applySelectOrSelectOnly(row, select) {
  if (!row || !select) return row;
  const result = {};
  Object.entries(select).forEach(([key, val]) => {
    if (val) {
      result[key] = row[key];
    }
  });
  return result;
}

function sortList(list, orderBy) {
  if (!orderBy) return list;
  return [...list].sort((a, b) => {
    for (const [key, direction] of Object.entries(orderBy)) {
      const valA = a[key];
      const valB = b[key];
      if (valA === valB) continue;
      const compare = valA > valB ? 1 : -1;
      return direction === 'desc' ? -compare : compare;
    }
    return 0;
  });
}

function getRelatedModelName(parentModel, relationKey) {
  const map = {
    paciente: { historias: 'historiaClinica', citas: 'cita', cotizaciones: 'cotizacion', pagos: 'pago', consentimientos: 'consentimiento', certificados: 'certificadoDental' },
    historiaClinica: { antecedentes: 'hcAntecedentes', examen: 'hcExamenEstomatologico', odontogramas: 'hcOdontograma', evoluciones: 'hojaEvolucion', adjuntos: 'hcAdjunto' },
    cotizacion: { procedimientos: 'procedimientoCotizacion', pagos: 'pago' }
  };
  return map[parentModel]?.[relationKey] || null;
}

function resolveIncludes(modelName, row, include, db) {
  if (!row) return row;
  const copy = { ...row };
  if (!include) return copy;

  Object.entries(include).forEach(([key, value]) => {
    if (!value) return;
    if (key === 'paciente' && (modelName === 'historiaClinica' || modelName === 'cotizacion' || modelName === 'certificadoDental' || modelName === 'consentimiento' || modelName === 'cita')) {
      const p = db.paciente.find(p => p.id === row.paciente_id);
      copy.paciente = p ? resolveIncludes('paciente', p, value.include || value.select, db) : null;
    }
    if (key === 'historias' && modelName === 'paciente') {
      let list = db.historiaClinica.filter(h => h.paciente_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      if (value.take) {
        list = list.slice(0, value.take);
      }
      copy.historias = list.map(item => resolveIncludes('historiaClinica', item, value.include || value.select, db));
    }
    if (key === 'citas' && (modelName === 'paciente' || modelName === 'certificadoDental')) {
      let list = db.cita.filter(c => c.paciente_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      if (value.take) {
        list = list.slice(0, value.take);
      }
      copy.citas = list.map(item => resolveIncludes('cita', item, value.include || value.select, db));
    }
    if (key === 'cotizaciones' && modelName === 'paciente') {
      let list = db.cotizacion.filter(c => c.paciente_id === row.id);
      if (value.where) {
        list = list.filter(item => matchesWhere(item, value.where));
      }
      copy.cotizaciones = list.map(item => resolveIncludes('cotizacion', item, value.include || value.select, db));
    }
    if (key === 'pagos' && (modelName === 'paciente' || modelName === 'cotizacion')) {
      let list = db.pago.filter(p => p.paciente_id === row.id || p.cotizacion_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      copy.pagos = list.map(item => resolveIncludes('pago', item, value.include || value.select, db));
    }
    if (key === 'antecedentes' && modelName === 'historiaClinica') {
      copy.antecedentes = db.hcAntecedentes.find(a => a.historia_id === row.id) || null;
    }
    if (key === 'examen' && modelName === 'historiaClinica') {
      copy.examen = db.hcExamenEstomatologico.find(e => e.historia_id === row.id) || null;
    }
    if (key === 'odontogramas' && modelName === 'historiaClinica') {
      let list = db.hcOdontograma.filter(o => o.historia_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      copy.odontogramas = list;
    }
    if (key === 'evoluciones' && modelName === 'historiaClinica') {
      let list = db.hojaEvolucion.filter(e => e.historia_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      copy.evoluciones = list;
    }
    if (key === 'adjuntos' && modelName === 'historiaClinica') {
      let list = db.hcAdjunto.filter(a => a.historia_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      copy.adjuntos = list;
    }
    if (key === 'procedimientos' && modelName === 'cotizacion') {
      let list = db.procedimientoCotizacion.filter(p => p.cotizacion_id === row.id);
      if (value.orderBy) {
        list = sortList(list, value.orderBy);
      }
      copy.procedimientos = list;
    }
  });

  return copy;
}

function createUnifiedPrismaMock(initialData = {}) {
  const db = {
    usuario: [],
    configuracion: [],
    paciente: [],
    historiaClinica: [],
    hcAntecedentes: [],
    hcExamenEstomatologico: [],
    hcOdontograma: [],
    hojaEvolucion: [],
    hcAdjunto: [],
    cita: [],
    consentimiento: [],
    certificadoDental: [],
    cotizacion: [],
    procedimientoCotizacion: [],
    pago: [],
    ...initialData
  };

  const client = {
    __db: db,
    $transaction: async (callback) => {
      if (typeof callback === 'function') {
        return callback(client);
      }
      if (Array.isArray(callback)) {
        const results = [];
        for (const op of callback) {
          results.push(await op);
        }
        return results;
      }
    }
  };

  const modelNames = [
    'usuario', 'configuracion', 'paciente', 'historiaClinica',
    'hcAntecedentes', 'hcExamenEstomatologico', 'hcOdontograma',
    'hojaEvolucion', 'hcAdjunto', 'cita', 'consentimiento',
    'certificadoDental', 'cotizacion', 'procedimientoCotizacion', 'pago'
  ];

  modelNames.forEach(modelName => {
    client[modelName] = {
      findMany: async (args = {}) => {
        let list = db[modelName].filter(row => matchesWhere(row, args.where));
        if (args.orderBy) list = sortList(list, args.orderBy);
        if (args.take) list = list.slice(0, args.take);
        return list.map(row => {
          const rowWithIncludes = resolveIncludes(modelName, row, args.include, db);
          return applySelectOrSelectOnly(rowWithIncludes, args.select);
        });
      },
      findFirst: async (args = {}) => {
        const row = db[modelName].find(row => matchesWhere(row, args.where));
        if (!row) return null;
        const rowWithIncludes = resolveIncludes(modelName, row, args.include, db);
        return applySelectOrSelectOnly(rowWithIncludes, args.select);
      },
      findUnique: async (args = {}) => {
        const row = db[modelName].find(row => matchesWhere(row, args.where));
        if (!row) return null;
        const rowWithIncludes = resolveIncludes(modelName, row, args.include, db);
        return applySelectOrSelectOnly(rowWithIncludes, args.select);
      },
      create: async (args = {}) => {
        const nextId = db[modelName].length ? Math.max(...db[modelName].map(r => r.id || 0)) + 1 : 1;
        const item = { id: nextId };
        
        Object.entries(args.data).forEach(([key, val]) => {
          if (val && typeof val === 'object' && 'create' in val) {
            const relatedModelName = getRelatedModelName(modelName, key);
            if (relatedModelName) {
              const createData = Array.isArray(val.create) ? val.create : [val.create];
              createData.forEach(childData => {
                const childNextId = db[relatedModelName].length ? Math.max(...db[relatedModelName].map(r => r.id || 0)) + 1 : 1;
                const childItem = { id: childNextId, [`${modelName}_id`]: nextId, ...childData };
                db[relatedModelName].push(childItem);
              });
            }
          } else {
            item[key] = val;
          }
        });
        
        db[modelName].push(item);
        const rowWithIncludes = resolveIncludes(modelName, item, args.include, db);
        return applySelectOrSelectOnly(rowWithIncludes, args.select);
      },
      createMany: async (args = {}) => {
        const list = Array.isArray(args.data) ? args.data : [args.data];
        list.forEach(row => {
          const nextId = db[modelName].length ? Math.max(...db[modelName].map(r => r.id || 0)) + 1 : 1;
          db[modelName].push({ id: nextId, ...row });
        });
        return { count: list.length };
      },
      update: async (args = {}) => {
        const idx = db[modelName].findIndex(row => matchesWhere(row, args.where));
        if (idx < 0) {
          const error = new Error('Record not found');
          error.code = 'P2025';
          throw error;
        }
        
        const current = db[modelName][idx];
        const updated = { ...current };
        
        Object.entries(args.data).forEach(([key, val]) => {
          if (val && typeof val === 'object' && 'create' in val) {
            const relatedModelName = getRelatedModelName(modelName, key);
            if (relatedModelName) {
              const createData = Array.isArray(val.create) ? val.create : [val.create];
              createData.forEach(childData => {
                const childNextId = db[relatedModelName].length ? Math.max(...db[relatedModelName].map(r => r.id || 0)) + 1 : 1;
                const childItem = { id: childNextId, [`${modelName}_id`]: current.id, ...childData };
                db[relatedModelName].push(childItem);
              });
            }
          } else {
            updated[key] = val;
          }
        });
        
        db[modelName][idx] = updated;
        const rowWithIncludes = resolveIncludes(modelName, updated, args.include, db);
        return applySelectOrSelectOnly(rowWithIncludes, args.select);
      },
      delete: async (args = {}) => {
        const idx = db[modelName].findIndex(row => matchesWhere(row, args.where));
        if (idx < 0) {
          const error = new Error('Record not found');
          error.code = 'P2025';
          throw error;
        }
        const [deleted] = db[modelName].splice(idx, 1);
        return deleted;
      },
      deleteMany: async (args = {}) => {
        const before = db[modelName].length;
        db[modelName] = db[modelName].filter(row => !matchesWhere(row, args.where));
        return { count: before - db[modelName].length };
      },
      count: async (args = {}) => {
        return db[modelName].filter(row => matchesWhere(row, args.where)).length;
      },
      upsert: async (args = {}) => {
        const row = db[modelName].find(row => matchesWhere(row, args.where));
        if (row) {
          const idx = db[modelName].indexOf(row);
          db[modelName][idx] = { ...row, ...args.update };
          return db[modelName][idx];
        } else {
          const nextId = db[modelName].length ? Math.max(...db[modelName].map(r => r.id || 0)) + 1 : 1;
          const newItem = { id: nextId, ...args.create };
          db[modelName].push(newItem);
          return newItem;
        }
      }
    };
  });

  return client;
}

function createCotizacionesPrismaMock() {
  return createUnifiedPrismaMock({
    paciente: [
      { id: 1, consultorio_id: 10, nombres: 'Ana', primer_apellido: 'Paz', segundo_apellido: null, tipo_documento: 'CC', numero_documento: '123', telefono: '3001234567' },
      { id: 2, consultorio_id: 99, nombres: 'Luis', primer_apellido: 'Roa', segundo_apellido: null, tipo_documento: 'CC', numero_documento: '999', telefono: null }
    ]
  });
}

function createPDFPrismaMock() {
  return createUnifiedPrismaMock({
    configuracion: [
      { id: 10, nombre_consultorio: 'Clínica A', nombre_profesional: 'Dr. A', logo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
      { id: 99, nombre_consultorio: 'Clínica B', nombre_profesional: 'Dr. B', logo_url: 'data:image/png;base64,invalid_image_base64_for_testing' }
    ],
    paciente: [
      { id: 1, consultorio_id: 10, nombres: 'Juan', primer_apellido: 'Pérez', segundo_apellido: 'Gómez', tipo_documento: 'CC', numero_documento: '123456', fecha_nacimiento: new Date('1990-01-01'), sexo: 'masculino', municipio_ciudad: 'Villavicencio' },
      { id: 2, consultorio_id: 99, nombres: 'Maria', primer_apellido: 'Lopez', tipo_documento: 'CC', numero_documento: '654321', fecha_nacimiento: new Date('1995-05-05'), sexo: 'femenino', municipio_ciudad: 'Villavicencio' }
    ],
    historiaClinica: [
      { id: 100, paciente_id: 1, motivo_consulta: 'Dolor', diagnostico: 'Caries', fecha_atencion: new Date('2026-07-01') },
      { id: 200, paciente_id: 2, motivo_consulta: 'Limpieza', diagnostico: 'Sano', fecha_atencion: new Date('2026-07-02') }
    ],
    cotizacion: [
      { id: 150, consultorio_id: 10, paciente_id: 1, total: 100000, total_pagado: 50000, saldo: 50000, fecha: new Date('2026-07-01'), estado: 'aprobado', tipo_tratamiento: 'General', prioridad: 'media', motivo: 'Revisión', observaciones: 'Ninguna' }
    ],
    certificadoDental: [
      { id: 250, consultorio_id: 10, paciente_id: 1, tipo_cita_texto: 'Valoración', fecha_expedicion: new Date('2026-07-01') }
    ],
    consentimiento: [
      { id: 350, consultorio_id: 10, paciente_id: 1, tipo: 'anestesia', fecha: new Date('2026-07-01'), ciudad: 'Villavicencio', campos_especificos: {}, nombre_paciente_declarado: 'Juan Pérez', cc_paciente_declarado: '123456' }
    ],
    odontogramas: [
      { id: 1, historia_id: 100, dientes_json: { "18": { "estado": "caries", "notes": "Revisar" } }, creado_en: new Date() }
    ]
  });
}

module.exports = {
  createUnifiedPrismaMock,
  createCotizacionesPrismaMock,
  createPDFPrismaMock
};
