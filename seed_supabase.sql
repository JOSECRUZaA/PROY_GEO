-- Script de Población de Datos (Seed) para GeoCarnes LPZ
-- IMPORTANTE: Ejecutar después de haber creado las tablas principales.

-- 1. Eliminar restricciones de autenticación para que funcione sin usuarios
ALTER TABLE puntos_venta ALTER COLUMN vendedor_id DROP NOT NULL;

-- 2. Insertar Productos Base
INSERT INTO productos (nombre, precio_referencial) VALUES 
('Carne de Res', 40.00),
('Carne de Pollo', 16.50),
('Carne de Cerdo', 28.00);

DO $$
DECLARE
    res_id UUID := uuid_generate_v4();
    pollo_id UUID := uuid_generate_v4();
    cerdo_id UUID := uuid_generate_v4();
    
    m1 UUID := uuid_generate_v4();
    m2 UUID := uuid_generate_v4();
    m3 UUID := uuid_generate_v4();
    m4 UUID := uuid_generate_v4();
    m5 UUID := uuid_generate_v4();
    m6 UUID := uuid_generate_v4();
    m7 UUID := uuid_generate_v4();
    m8 UUID := uuid_generate_v4();
BEGIN

    -- Insertar Productos
    INSERT INTO productos (id, nombre, precio_referencial) VALUES 
    (res_id, 'Carne de Res', 40.00),
    (pollo_id, 'Carne de Pollo', 16.50),
    (cerdo_id, 'Carne de Cerdo', 28.00);

    -- Insertar Puntos de Venta (Mercados y Ferias) sin asociarlos a un vendedor
    INSERT INTO puntos_venta (id, vendedor_id, nombre, tipo, latitud, longitud, estado_aprobacion) VALUES
    (m1, NULL, 'Mercado Garita de Lima', 'formal', -16.4950, -68.1450, 'aprobado'),
    (m2, NULL, 'Mercado Villa Tunari (El Alto)', 'formal', -16.4850, -68.1950, 'aprobado'),
    (m3, NULL, 'Feria 16 de Julio', 'informal', -16.4900, -68.1700, 'aprobado'),
    (m4, NULL, 'Mercado Rodríguez', 'formal', -16.5020, -68.1380, 'aprobado'),
    (m5, NULL, 'Mercado Achumani', 'formal', -16.5400, -68.0800, 'aprobado'),
    (m6, NULL, 'Mercado Río Seco (El Alto)', 'formal', -16.4600, -68.2100, 'aprobado'),
    (m7, NULL, 'Mercado Lanza', 'formal', -16.4965, -68.1355, 'aprobado'),
    (m8, NULL, 'Cruce Viacha', 'formal', -16.5150, -68.1800, 'aprobado');

    -- Insertar Inventarios (Estado actual de abastecimiento y precios)
    
    -- Mercado Garita de Lima (Especulación / Agotado)
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m1, pollo_id, 23.00, 'Agotado', 1.0),
    (m1, res_id, 45.00, 'Escaso', 0.8);

    -- Villa Tunari
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m2, pollo_id, 22.00, 'Escaso', 0.8),
    (m2, res_id, 44.00, 'Escaso', 0.7);

    -- Feria 16 de Julio (Abastecido)
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m3, pollo_id, 17.00, 'Normal', 0.2),
    (m3, res_id, 38.00, 'Normal', 0.2);

    -- Mercado Rodríguez
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m4, pollo_id, 19.00, 'Poco', 0.5),
    (m4, res_id, 40.00, 'Normal', 0.3);

    -- Mercado Achumani
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m5, pollo_id, 18.00, 'Normal', 0.1),
    (m5, res_id, 42.00, 'Normal', 0.2);

    -- Río Seco (Crítico)
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m6, pollo_id, 25.00, 'Agotado', 1.0),
    (m6, res_id, 48.00, 'Agotado', 1.0);

    -- Lanza
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m7, pollo_id, 20.00, 'Escaso', 0.7),
    (m7, res_id, 41.00, 'Normal', 0.3);

    -- Cruce Viacha
    INSERT INTO inventarios (punto_venta_id, producto_id, precio_actual, estado, nivel_calor) VALUES
    (m8, pollo_id, 21.00, 'Escaso', 0.8),
    (m8, res_id, 46.00, 'Escaso', 0.9);

END $$;
