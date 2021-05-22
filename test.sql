SELECT COUNT(id) as calls, date(`createdAt`) as createdAt 
GROUP BY date(`createdAt`)
ORDER BY date(`createdAt`) DESC
LIMIT 7;