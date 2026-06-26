-- 1. CREACIÓN DE TABLAS BASE

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Para asegurarnos de que la estructura se actualice, borramos las tablas si existen
DROP TABLE IF EXISTS inventarios CASCADE;
DROP TABLE IF EXISTS roles_usuario CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS puntos_venta CASCADE;
DROP TABLE IF EXISTS productos CASCADE;

-- Productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    precio_referencial NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Puntos de Venta (Tiendas / Mercados)
CREATE TABLE IF NOT EXISTS puntos_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendedor_id UUID, -- Puede ser null si es un mercado general
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    latitud NUMERIC(10, 6) NOT NULL,
    longitud NUMERIC(10, 6) NOT NULL,
    estado_aprobacion TEXT DEFAULT 'aprobado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proveedores (Sofía, Imba, Mataderos)
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo_producto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles de Usuario
CREATE TABLE IF NOT EXISTS roles_usuario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE, -- Mapeado a auth.users.id
    email TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('superadmin', 'proveedor', 'tienda')),
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
    punto_venta_id UUID REFERENCES puntos_venta(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventarios / Asignaciones
CREATE TABLE IF NOT EXISTS inventarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    punto_venta_id UUID REFERENCES puntos_venta(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    cantidad_asignada INTEGER DEFAULT 0,
    precio_actual NUMERIC(10, 2) NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('Normal', 'Poco', 'Escaso', 'Agotado')),
    nivel_calor NUMERIC(3, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LIMPIEZA DE DATOS (Opcional, para reiniciar)
TRUNCATE TABLE inventarios CASCADE;
TRUNCATE TABLE puntos_venta CASCADE;
TRUNCATE TABLE productos CASCADE;
TRUNCATE TABLE proveedores CASCADE;
TRUNCATE TABLE roles_usuario CASCADE;

-- 3. INSERCIÓN DE DATOS DE PRUEBA
DO $$
DECLARE
    res_id UUID := uuid_generate_v4();
    pollo_id UUID := uuid_generate_v4();
    cerdo_id UUID := uuid_generate_v4();
    
    prov_sofia UUID := uuid_generate_v4();
    prov_imba UUID := uuid_generate_v4();
    prov_matadero UUID := uuid_generate_v4();
    
    m1 UUID := uuid_generate_v4();
    m2 UUID := uuid_generate_v4();
    m3 UUID := uuid_generate_v4();
BEGIN

    -- Insertar Productos
    INSERT INTO productos (id, nombre, precio_referencial) VALUES 
    (res_id, 'Carne de Res', 40.00),
    (pollo_id, 'Carne de Pollo', 16.50),
    (cerdo_id, 'Carne de Cerdo', 28.00);

    -- Insertar Proveedores
    INSERT INTO proveedores (id, nombre, tipo_producto) VALUES 
    (prov_sofia, 'Sofía', 'Carne de Pollo'),
    (prov_imba, 'Imba', 'Carne de Pollo'),
    (prov_matadero, 'Matadero Municipal La Paz', 'Carne de Res');

    -- Insertar Puntos de Venta
    INSERT INTO puntos_venta (id, vendedor_id, nombre, tipo, latitud, longitud, estado_aprobacion) VALUES
    (m1, NULL, 'Mercado Garita de Lima', 'formal', -16.4950, -68.1450, 'aprobado'),
    (m2, NULL, 'Feria 16 de Julio', 'informal', -16.4900, -68.1700, 'aprobado'),
    (m3, NULL, 'Mercado Rodríguez', 'formal', -16.5020, -68.1380, 'aprobado');

    -- Insertar Asignaciones de Inventario
    INSERT INTO inventarios (punto_venta_id, producto_id, proveedor_id, cantidad_asignada, precio_actual, estado, nivel_calor) VALUES
    (m1, pollo_id, prov_sofia, 500, 16.50, 'Normal', 0.2),
    (m1, res_id, prov_matadero, 150, 40.00, 'Escaso', 0.8),
    (m2, pollo_id, prov_imba, 1000, 15.50, 'Normal', 0.1);

END $$;

-- 4. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas temporales para permitir lectura y escritura pública (simplificación)
DROP POLICY IF EXISTS "Permitir select a todos" ON productos;
CREATE POLICY "Permitir select a todos" ON productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir select a todos" ON puntos_venta;
CREATE POLICY "Permitir select a todos" ON puntos_venta FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir select a todos" ON inventarios;
CREATE POLICY "Permitir select a todos" ON inventarios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir select a todos" ON proveedores;
CREATE POLICY "Permitir select a todos" ON proveedores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir select a todos" ON roles_usuario;
CREATE POLICY "Permitir select a todos" ON roles_usuario FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir insert a todos" ON roles_usuario;
CREATE POLICY "Permitir insert a todos" ON roles_usuario FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update a todos" ON roles_usuario;
CREATE POLICY "Permitir update a todos" ON roles_usuario FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir insert a todos" ON inventarios;
CREATE POLICY "Permitir insert a todos" ON inventarios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir update a todos" ON inventarios;
CREATE POLICY "Permitir update a todos" ON inventarios FOR UPDATE USING (true) WITH CHECK (true);
