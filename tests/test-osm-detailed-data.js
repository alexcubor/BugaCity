const axios = require('axios');
const fs = require('fs');

/**
 * Тестирование детальных данных OpenStreetMap
 * Проверяем, какие векторные данные можно получить на уровне отдельных домов
 */

class OSMDataTester {
    constructor() {
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
        this.nominatimUrl = 'https://nominatim.openstreetmap.org';
        this.results = {
            buildings: [],
            detailedBuildings: [],
            vectorData: [],
            errors: []
        };
    }

    /**
     * Тест 1: Получение зданий через Overpass API
     * Ищем здания в конкретной области (например, в центре Москвы)
     */
    async testBuildingsData() {
        console.log('🏢 Тестирование получения данных о зданиях...');
        
        const query = `
            [out:json][timeout:25];
            (
              way["building"](55.7,37.5,55.8,37.7);
              relation["building"](55.7,37.5,55.8,37.7);
            );
            out geom;
        `;

        try {
            const response = await axios.post(this.overpassUrl, query, {
                headers: { 'Content-Type': 'text/plain' }
            });

            const buildings = response.data.elements || [];
            console.log(`✅ Найдено зданий: ${buildings.length}`);
            
            // Анализируем детализацию данных
            buildings.slice(0, 5).forEach((building, index) => {
                console.log(`\n🏠 Здание ${index + 1}:`);
                console.log(`   ID: ${building.id}`);
                console.log(`   Тип: ${building.type}`);
                console.log(`   Теги:`, building.tags);
                console.log(`   Геометрия:`, building.geometry ? `${building.geometry.length} точек` : 'Нет геометрии');
                
                if (building.geometry && building.geometry.length > 0) {
                    console.log(`   Первая точка: [${building.geometry[0].lat}, ${building.geometry[0].lon}]`);
                }
            });

            this.results.buildings = buildings;
            return buildings;
        } catch (error) {
            console.error('❌ Ошибка при получении зданий:', error.message);
            this.results.errors.push({ test: 'buildings', error: error.message });
            return [];
        }
    }

    /**
     * Тест 2: Детальные данные о конкретном здании
     * Ищем здание с максимальной детализацией
     */
    async testDetailedBuildingData() {
        console.log('\n🔍 Тестирование детальных данных о зданиях...');
        
        const query = `
            [out:json][timeout:25];
            (
              way["building"]["name"](55.7,37.5,55.8,37.7);
              way["building"]["addr:housenumber"](55.7,37.5,55.8,37.7);
            );
            out geom meta;
        `;

        try {
            const response = await axios.post(this.overpassUrl, query, {
                headers: { 'Content-Type': 'text/plain' }
            });

            const detailedBuildings = response.data.elements || [];
            console.log(`✅ Найдено детализированных зданий: ${detailedBuildings.length}`);
            
            detailedBuildings.slice(0, 3).forEach((building, index) => {
                console.log(`\n🏢 Детальное здание ${index + 1}:`);
                console.log(`   ID: ${building.id}`);
                console.log(`   Название: ${building.tags.name || 'Без названия'}`);
                console.log(`   Адрес: ${building.tags['addr:housenumber'] || 'Без номера'} ${building.tags['addr:street'] || ''}`);
                console.log(`   Тип здания: ${building.tags.building || 'Не указан'}`);
                console.log(`   Высота: ${building.tags['building:levels'] || 'Не указана'}`);
                console.log(`   Материал: ${building.tags['building:material'] || 'Не указан'}`);
                console.log(`   Год постройки: ${building.tags['start_date'] || 'Не указан'}`);
                console.log(`   Все теги:`, building.tags);
                
                if (building.geometry) {
                    console.log(`   Геометрия: ${building.geometry.length} точек`);
                    console.log(`   Координаты границ:`, building.geometry.map(p => `[${p.lat}, ${p.lon}]`).slice(0, 3));
                }
            });

            this.results.detailedBuildings = detailedBuildings;
            return detailedBuildings;
        } catch (error) {
            console.error('❌ Ошибка при получении детальных зданий:', error.message);
            this.results.errors.push({ test: 'detailedBuildings', error: error.message });
            return [];
        }
    }

    /**
     * Тест 3: Векторные данные через Nominatim API
     * Получаем структурированные данные о местоположении
     */
    async testVectorData() {
        console.log('\n🗺️ Тестирование векторных данных через Nominatim...');
        
        try {
            // Поиск конкретного адреса
            const searchQuery = 'Красная площадь, Москва';
            const searchResponse = await axios.get(`${this.nominatimUrl}/search`, {
                params: {
                    q: searchQuery,
                    format: 'json',
                    addressdetails: 1,
                    extratags: 1,
                    namedetails: 1,
                    limit: 1
                }
            });

            if (searchResponse.data.length > 0) {
                const place = searchResponse.data[0];
                console.log(`✅ Найденное место: ${place.display_name}`);
                console.log(`   Координаты: [${place.lat}, ${place.lon}]`);
                console.log(`   Тип: ${place.type}`);
                console.log(`   Класс: ${place.class}`);
                console.log(`   Важность: ${place.importance}`);
                console.log(`   Детали адреса:`, place.address);
                console.log(`   Дополнительные теги:`, place.extratags);
            }

            // Получение данных о зданиях в радиусе
            const lat = 55.7539;
            const lon = 37.6208;
            const radius = 0.001; // ~100 метров

            const reverseResponse = await axios.get(`${this.nominatimUrl}/reverse`, {
                params: {
                    lat: lat,
                    lon: lon,
                    format: 'json',
                    addressdetails: 1,
                    extratags: 1,
                    zoom: 18 // Максимальная детализация
                }
            });

            console.log(`\n📍 Обратный геокодинг для координат [${lat}, ${lon}]:`);
            console.log(`   Адрес: ${reverseResponse.data.display_name}`);
            console.log(`   Детали:`, reverseResponse.data.address);
            console.log(`   Дополнительные теги:`, reverseResponse.data.extratags);

            this.results.vectorData = {
                search: searchResponse.data,
                reverse: reverseResponse.data
            };

            return this.results.vectorData;
        } catch (error) {
            console.error('❌ Ошибка при получении векторных данных:', error.message);
            this.results.errors.push({ test: 'vectorData', error: error.message });
            return null;
        }
    }

    /**
     * Тест 4: Специализированные запросы для максимальной детализации
     */
    async testMaximumDetailData() {
        console.log('\n🎯 Тестирование максимальной детализации данных...');
        
        // Запрос для получения всех возможных деталей о зданиях
        const detailedQuery = `
            [out:json][timeout:30];
            (
              way["building"](55.7,37.5,55.8,37.7);
            );
            out geom meta qt;
        `;

        try {
            const response = await axios.post(this.overpassUrl, detailedQuery, {
                headers: { 'Content-Type': 'text/plain' }
            });

            const buildings = response.data.elements || [];
            console.log(`✅ Зданий с максимальной детализацией: ${buildings.length}`);

            // Анализируем все доступные атрибуты
            const allTags = new Set();
            buildings.forEach(building => {
                if (building.tags) {
                    Object.keys(building.tags).forEach(tag => allTags.add(tag));
                }
            });

            console.log(`\n📊 Все доступные атрибуты зданий (${allTags.size}):`);
            Array.from(allTags).sort().forEach(tag => {
                console.log(`   - ${tag}`);
            });

            // Находим здание с максимальным количеством атрибутов
            const mostDetailedBuilding = buildings.reduce((max, building) => {
                const currentTags = building.tags ? Object.keys(building.tags).length : 0;
                const maxTags = max.tags ? Object.keys(max.tags).length : 0;
                return currentTags > maxTags ? building : max;
            }, buildings[0] || {});

            if (mostDetailedBuilding.tags) {
                console.log(`\n🏆 Самое детализированное здание (${Object.keys(mostDetailedBuilding.tags).length} атрибутов):`);
                console.log(`   ID: ${mostDetailedBuilding.id}`);
                Object.entries(mostDetailedBuilding.tags).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            }

            return buildings;
        } catch (error) {
            console.error('❌ Ошибка при получении максимально детальных данных:', error.message);
            this.results.errors.push({ test: 'maximumDetail', error: error.message });
            return [];
        }
    }

    /**
     * Тест 5: Экспорт векторных данных в различных форматах
     */
    async testVectorExport() {
        console.log('\n📤 Тестирование экспорта векторных данных...');
        
        try {
            // Получаем данные в формате GeoJSON
            const geoJsonQuery = `
                [out:json][timeout:25];
                (
                  way["building"](55.7,37.5,55.8,37.7);
                );
                out geom;
            `;

            const response = await axios.post(this.overpassUrl, geoJsonQuery, {
                headers: { 'Content-Type': 'text/plain' }
            });

            const buildings = response.data.elements || [];
            
            // Конвертируем в GeoJSON
            const geoJson = {
                type: "FeatureCollection",
                features: buildings.map(building => ({
                    type: "Feature",
                    properties: {
                        id: building.id,
                        type: building.type,
                        tags: building.tags || {}
                    },
                    geometry: building.geometry ? {
                        type: "Polygon",
                        coordinates: [building.geometry.map(point => [point.lon, point.lat])]
                    } : null
                })).filter(feature => feature.geometry)
            };

            console.log(`✅ Создан GeoJSON с ${geoJson.features.length} объектами`);
            console.log(`   Размер данных: ${JSON.stringify(geoJson).length} символов`);
            
            // Сохраняем в файл для анализа
            const filename = `/Users/alexcubor/Documents/BugaCity/tests/osm_vector_data_${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify(geoJson, null, 2));
            console.log(`   Сохранено в файл: ${filename}`);

            return geoJson;
        } catch (error) {
            console.error('❌ Ошибка при экспорте векторных данных:', error.message);
            this.results.errors.push({ test: 'vectorExport', error: error.message });
            return null;
        }
    }

    /**
     * Запуск всех тестов
     */
    async runAllTests() {
        console.log('🚀 Начинаем тестирование OpenStreetMap API для получения детальных векторных данных\n');
        
        const startTime = Date.now();
        
        try {
            await this.testBuildingsData();
            await this.testDetailedBuildingData();
            await this.testVectorData();
            await this.testMaximumDetailData();
            await this.testVectorExport();
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            console.log(`\n📊 ИТОГИ ТЕСТИРОВАНИЯ:`);
            console.log(`   Время выполнения: ${duration} секунд`);
            console.log(`   Найдено зданий: ${this.results.buildings.length}`);
            console.log(`   Детализированных зданий: ${this.results.detailedBuildings.length}`);
            console.log(`   Ошибок: ${this.results.errors.length}`);
            
            if (this.results.errors.length > 0) {
                console.log(`\n❌ Ошибки:`);
                this.results.errors.forEach(error => {
                    console.log(`   - ${error.test}: ${error.error}`);
                });
            }
            
            console.log(`\n✅ Тестирование завершено!`);
            
        } catch (error) {
            console.error('💥 Критическая ошибка при тестировании:', error);
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const tester = new OSMDataTester();
    tester.runAllTests().catch(console.error);
}

module.exports = OSMDataTester;

