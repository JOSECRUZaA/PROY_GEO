-- Script de Población de Datos (Seed) para GeoCarnes LPZ
-- IMPORTANTE: Ejecutar después de haber creado las tablas principales.

-- 1. Insertar Perfiles (Opcional, asumiendo que ya tienes usuarios creados)
-- Si no tienes usuarios autenticados, puedes omitir el vendedor_id o crear usuarios dummy si tus políticas RLS lo permiten.
-- NOTA: Para este seed simple, insertaremos Puntos de Venta sin validar vendedor_id estricto, o puedes reemplazar 'TU_UUID_AQUI' por tu ID de usuario de auth.users.

-- Si tu tabla puntos_venta requiere vendedor_id estricto, asegúrate de cambiar la estructura o usar un ID real.
-- Para que el insert funcione sin errores de llave foránea (si perfiles está vacío):
-- Primero asegúrate de registrarte en la app para tener al menos un UUID válido, y reemplaza '00000000-0000-0000-0000-000000000000' por ese ID.

-- Para propósitos de este script, asumiremos que se insertan los productos y mercados base.

-- 2. Insertar Productos Base
INSERT INTO productos (nombre, precio_referencial) VALUES 
('Carne de Res', 40.00),
('Carne de Pollo', 16.50),
('Carne de Cerdo', 28.00);

-- Obtener los IDs generados temporalmente (En PostgreSQL puro se haría con variables, aquí lo hacemos directo si conocemos la base)
-- Como usamos UUID, lo ideal es usar gen_random_uuid() o declarar explícitamente.

DO $$
DECLARE
    res_id UUID := uuid_generate_v4();
    pollo_id UUID := uuid_generate_v4();
    cerdo_id UUID := uuid_generate_v4();
    -- UUID del administrador/vendedor por defecto (REEMPLAZA ESTO CON TU UUID DE SUPABASE AUTH)
    admin_id UUID := (SELECT id FROM auth.users LIMIT 1); 
    
    m1 UUID := uuid_generate_v4();
    m2 UUID := uuid_generate_v4();
    m3 UUID := uuid_generate_v4();
    m4 UUID := uuid_generate_v4();
    m5 UUID := uuid_generate_v4();
    m6 UUID := uuid_generate_v4();
    m7 UUID := uuid_generate_v4();
    m8 UUID := uuid_generate_v4();
BEGIN
    -- Si no hay usuarios, abortamos suavemente para no romper.
    IF admin_id IS NULL THEN
        RAISE NOTICE 'No hay usuarios en auth.users. Registra un usuario primero.';
        RETURN;
    END IF;

    -- Aseguramos que exista en perfiles
    INSERT INTO perfiles (id, rol, nombre_completo) 
    VALUES (admin_id, 'distribuidor', 'Admin Sistema') 
    ON CONFLICT (id) DO NOTHING;

    -- Insertar Productos
    INSERT INTO productos (id, nombre, precio_referencial) VALUES 
    (res_id, 'Carne de Res', 40.00),
    (pollo_id, 'Carne de Pollo', 16.50),
    (cerdo_id, 'Carne de Cerdo', 28.00);

    -- Insertar Puntos de Venta (Mercados y Ferias)
    INSERT INTO puntos_venta (id, vendedor_id, nombre, tipo, latitud, longitud, estado_aprobacion) VALUES
    (m1, admin_id, 'Mercado Garita de Lima', 'formal', -16.4950, -68.1450, 'aprobado'),
    (m2, admin_id, 'Mercado Villa Tunari (El Alto)', 'formal', -16.4850, -68.1950, 'aprobado'),
    (m3, admin_id, 'Feria 16 de Julio', 'informal', -16.4900, -68.1700, 'aprobado'),
    (m4, admin_id, 'Mercado Rodríguez', 'formal', -16.5020, -68.1380, 'aprobado'),
    (m5, admin_id, 'Mercado Achumani', 'formal', -16.5400, -68.0800, 'aprobado'),
    (m6, admin_id, 'Mercado Río Seco (El Alto)', 'formal', -16.4600, -68.2100, 'aprobado'),
    (m7, admin_id, 'Mercado Lanza', 'formal', -16.4965, -68.1355, 'aprobado'),
    (m8, admin_id, 'Cruce Viacha', 'formal', -16.5150, -68.1800, 'aprobado');

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
