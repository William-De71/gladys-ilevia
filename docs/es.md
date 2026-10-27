# Ilévia Lille

## Presentación

Esta integración lleva **Ilévia**, la red de autobuses, metro y tranvía de la Métropole Européenne de Lille, a Gladys. Da los **próximos pasos de los autobuses en tiempo real** en las paradas que elijas (tres en el formulario, hasta 20 más con un botón), filtrados por línea y dirección. También sigue el **tráfico** de hasta seis líneas, autobús, metro o tranvía (normal, aviso de tráfico, tráfico alterado), con los mensajes de Ilévia. Cada parada y cada línea se convierte en un dispositivo para mostrar en un panel y usar en las escenas.

Los datos proceden de los **datos abiertos oficiales de Ilévia**, publicados por la MEL en `data.lillemetropole.fr` bajo la Licence Ouverte 2.0: sin cuenta ni clave. Todas las paradas seguidas se leen juntas, en una sola petición, cada minuto por defecto (cada 10 minutos mientras ninguna parada anuncia nada, de noche). El tráfico se lee cada 5 minutos. La integración guarda las líneas y paradas de la red y las vuelve a leer una vez al día y una vez por semana.

Lo que los datos abiertos de Ilévia no dan, y que por tanto la integración no se inventa:

- **ningún paso del metro**: los trenes automáticos no figuran. Sigue las líneas de metro para su tráfico;
- **el tranvía solo cuando Ilévia lo publica**: el conjunto anuncia «autobús y tranvía», pero el 27 de octubre de 2026 no contenía ningún paso de tranvía;
- **ningún horario teórico, por tanto ningún retraso**: solo la hora estimada, en la próxima media hora.

Es una integración **cloud**: contacta `data.lillemetropole.fr`. Nada más sale de tu red.

## Requisitos previos

- Gladys Assistant 5.3.0 o posterior.
- Nada más: los datos abiertos de Ilévia no piden cuenta ni clave.

## Configuración

| Campo                  | Qué escribir                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Parada 1, 2, 3         | El nombre de la parada («Gare Lille Flandres») para todos los lados de la calle, o un código («LIG115») para un solo lado. |
| Línea                  | Solo esta línea: «L5», «50», «CO1». Vacío: todas las líneas de la parada.                                                  |
| Dirección              | Solo los destinos que contienen estas palabras: «Haubourdin», «Comines \| Halluin». Vacío: ambos sentidos.                 |
| Líneas seguidas        | Las líneas cuyo tráfico sigues, seis como máximo: «M1, M2, tram, L1».                                                      |
| Lectura de las paradas | Cada 30 segundos, minuto, 2 minutos o 5 minutos.                                                                           |
| Idioma de los textos   | Nombres de los dispositivos, resúmenes y salidas de las escenas. Los nombres de paradas y los mensajes quedan en francés.  |

El botón **Buscar una parada** da los nombres exactos de las paradas que contienen algunas palabras, con el código de cada lado de la calle y las líneas y destinos anunciados en la próxima media hora («LIG115 → 14 Marquette les Voiles, 50 Chemin de Messines»): copia el código del lado donde subes. **Probar la conexión** lee la red, cada parada y cada línea de inmediato.

Una misma parada tiene a veces varios nombres en los datos («Pont de Bois» o «V. d’Ascq Pont de Bois»): la integración los conoce todos y reúne sus pasos.

Más paradas que las tres del formulario (casa, trabajo…): **Añadir una parada** retoma los mismos tres campos — parada, línea, dirección — y sigue hasta 20 paradas más. **Listar las paradas** muestra todas las paradas seguidas, numeradas; **Quitar una parada** toma ese número (o el nombre). Las paradas añadidas se guardan en la configuración de Gladys y siguen por tanto sus copias de seguridad.

## Uso

### Dispositivos

En la pestaña **Descubrir**, crea los dispositivos que quieras:

- **Ilévia \<parada\>**: el próximo paso en texto («L5 → Haubourdin le Parc · 6 min») y la espera del próximo paso y del siguiente (minutos);
- **Ilévia línea \<línea\>**, **Ilévia metro 1** o **Ilévia tranvía**: el tráfico en texto («Tráfico alterado: En raison d’un défaut sur une rame…») y el número de mensajes de Ilévia en curso.

De noche, sin ningún paso, las esperas conservan su último valor.

### Tráfico

Ilévia publica mensajes «Perturbation» (una incidencia: metro interrumpido, autobús desviado) e «Information» (obras, parada desplazada). Un mensaje vale un día, salvo que anuncie un fin anterior, y cada novedad de una incidencia es un mensaje nuevo. Ilévia no dice cuándo termina una incidencia. El estado de una línea sigue por tanto su mensaje más reciente: **tráfico alterado** durante 90 minutos tras un mensaje de incidencia, **aviso de tráfico** mientras un mensaje vale, **tráfico normal** si no.

### Widgets del panel

![El widget Salidas Ilévia en Gare Lille Flandres y el widget Tráfico Ilévia del metro, el tranvía y una línea de autobús (ilustración generada, no una captura de pantalla)](https://raw.githubusercontent.com/William-De71/gladys-ilevia/main/docs/assets/widgets.es.png)

- **Salidas Ilévia**: los próximos pasos de una parada, en compacto. Una fila por línea de autobús y destino, con sus próximos pasos seguidos («2 · 17 min»). El ajuste **Trayectos mostrados** fija el número de filas. Elige una parada seguida, o escribe cualquier parada (y una línea) en los ajustes del widget. Con **Varias paradas**, un solo widget muestra varios dispositivos de parada: los dispositivos de una misma parada se reúnen bajo su nombre; para paradas distintas, cada fila empieza por su parada.
- **Tráfico Ilévia**: el estado de cada línea, luego los mensajes de Ilévia, las incidencias primero, con su hora de publicación. Toca una tarjeta para el texto completo. Las líneas seguidas, las escritas en los ajustes, o el metro y el tranvía si no sigues ninguna.

### Escenas

Desencadenantes, una vez por cambio (la primera lectura solo sirve de referencia):

- **Ilévia: autobús en breve**: un paso en una parada seguida sale dentro de 2, 3, 5, 10, 15 o 20 minutos.
- **Ilévia: línea alterada**: Ilévia publica un mensaje de incidencia sobre una línea seguida.
- **Ilévia: fin de la incidencia**: la línea ya no tiene incidencia en curso (un mensaje más reciente, o 90 minutos pasados).
- **Ilévia: nuevo aviso de tráfico**: Ilévia publica un mensaje sobre una línea seguida, incidencia o información.

Cada uno da una frase lista, `{{triggerEvent.data.summary}}`, y sus valores (línea, destino, hora, título, texto, hora de publicación…). Las acciones **Ilévia: próximos pasos** e **Ilévia: tráfico de una línea** devuelven el mismo tipo de valores, para poner en un mensaje o comprobar en una condición.

Ejemplos:

- Cuando la L5 hacia Haubourdin sale de Gare Lille Flandres dentro de 5 minutos → encender la lámpara de la entrada en verde.
- Cuando el metro 1 está alterado → enviar el resumen a tu teléfono antes de salir.
- Cada día laborable a las 7:30 → leer los próximos pasos de tu parada y hacer que el altavoz de la cocina los anuncie.

### Transporte

Solo cloud: los datos vienen de internet. Solo se piden al servidor de la MEL las paradas que sigues, en una petición.

## Solución de problemas

- **«Desconocido para Ilévia»**: usa **Buscar una parada** y copia el nombre exacto o un código; para una línea, su nombre como en los autobuses («L5», «50»), «M1» o «M2» para el metro, «tram» para el tranvía.
- **Ningún paso**: de noche la red duerme; la parada se vuelve a leer cada 10 minutos. En un andén de tranvía, Ilévia no siempre publica los pasos.
- **«Los datos abiertos de la MEL no responden»**: la integración lo vuelve a intentar en cada lectura; los últimos pasos se quedan en los widgets.
- **Una incidencia terminada sigue «alterada»**: Ilévia no publica el fin de las incidencias; el estado vuelve al aviso de tráfico 90 minutos después del último mensaje de incidencia, o en cuanto llega un mensaje más reciente.
- **Para informar de un problema**: pulsa **Diagnóstico** y copia las líneas que empiezan por «Ilévia diagnostic» de la pestaña Registros en un issue de GitHub o una respuesta en el foro, con las versiones de Gladys y de la integración.
