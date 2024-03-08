//Importacion de los paquees a usar en el sistema 
const express = require('express');
const bodyParser=require('body-parser');
const mysql=require('mysql2/promise');
const app=express();
const path = require('path');
const session = require('express-session'); //Genrar las cookis

//configurar middleware
app.use(bodyParser.urlencoded({ extended: true } ) );
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.use(
    session({
    secret: "hola",
    resave: false,
    saveUninitialized: false,
})
);

//configurar conexion a la base de datos
const db={
    host: 'localhost',
    user: 'root' ,
    password: '',
    database: 'manzanotas',
};
//Se crean los usuarios para que esto sean logeados para iniciar sesion
app.post('/crear', async (req, res)=>{
    const {nombre_usuarios,tipo_documento,documento,id_m2}=req.body;
    try{
    const input=await mysql.createConnection(db)    
    let [indicador]= await input.execute('SELECT * FROM usuarios WHERE documento= ? AND tipo_documento= ?',
    [documento,tipo_documento]) //Se hace esta consulta para buscar el usuario bajo su numero de Doc el cual es unico
    
    if(indicador.length>0){
        res.status(401).send(`
        <script>
            window.onload= function() {
                alert('Ya existe este usuario');
                window.location.href ='http://127.0.0.1:5500/vista/html/inicio.html';
        }
        </script>
        `)}
    else{    
    await input.execute('INSERT INTO usuarios (nombre_usuarios,tipo_documento,documento,id_m2) VALUES (?,?,?,?)', 
    [nombre_usuarios,tipo_documento,documento,id_m2])
    res.status(201).send(`
    <script>
        window.onload= function() {
            alert('Datos guardados');
            window.location.href='http://127.0.0.1:5500/vista/html/inicio.html'; 
    }
    </script>
    `)}
    await input.end()
    }
    catch(error){
        console.error('Error en el servidor',error)
        res.status(500).send('paila el envio')
    }
    });

//Se inicia  sesion por parte del usuario ya sea Admin o usuario 
    app.post('/iniciar',async(req,res)=>{
        const{tipo_documento,documento}=req.body
        try{
        const input=await mysql.createConnection(db)    
         //Verificar credenciales
         let [indicador]= await input.execute('SELECT * FROM usuarios WHERE tipo_documento= ? AND documento= ? ',
         [tipo_documento,documento])
         console.log(indicador)
         if(indicador.length>0){
            req.session.usuario=indicador[0].nombre_usuarios;
            req.session.documento = documento;
            if(indicador[0].rol=="Admin"){//Se indica el rol admin
                const usuario ={nombre_usuarios: indicador[0].nombre_usuarios}
                console.log(usuario)
                res.locals.usuario=usuario
                res.sendFile(path.join(__dirname,`../../vista/html/Admin.html`))
                }else{
                    const usuario ={nombre_usuarios : indicador[0].nombre_usuarios}
                    console.log(usuario)
                    res.locals.usuario=usuario
                    res.sendFile(path.join(__dirname,`../../vista/html/usuario.html`))
                }
         }
         else{
            res.status(401).send('Usuario no encontrado')
         }
        await input.end()
        }
        catch(error){
            console.log('Error en el servidor:',error)
            res.status(500).send(`
            <script>
            window.onload= function() {
                alert('Error en el servidor');
                window.location.href='http://127.0.0.1:5500/vista/html/inicio.html';
            }
            </script>
            `)
        }
    })

app.post('/obtener-usuario', (req,res)=>{
        const usuario = req.session.usuario
        console.log(usuario)
        if(usuario){
            res.json({nombre_usuarios : usuario})
            /* res.status(200).send("iniciado") */
        }else{
            res.status(401).send('Usuario no encontrado')
       
        }
    });

   /*  app.get('/Bienvenido',(req,res)=>{
        res.sendFile('/taller/Quinto  trimestre/Oswaldo/trabajo 1/vista/html/usuario.html')
    }) */


    app.post('/obtener-servicios-usuario',async(req,res)=>{
        const nombreusario= req.session.usuario
        const Doc = req.session.documento
       /* const {usuario}=req.body
        const usuarioArray=usuario.split(",") 
        console.log("documento",usuarioArray[1]) */
        console.log(nombreusario,Doc)
        try {
            const input=await mysql.createConnection(db) 
            const[serviciosData]= await input.execute('SELECT servicios.nombre_servicios FROM usuarios INNER JOIN manzanas ON manzanas.id_m = usuarios.id_m2 INNER JOIN m_s ON m_s.id_m1 = manzanas.id_m INNER JOIN servicios ON servicios.ud_servicios = m_s.id_s1 WHERE usuarios.documento= ? ORDER BY servicios.ud_servicios ASC',[Doc])
            console.log(serviciosData)
            res.json({servicios: serviciosData.map(row=>row.nombre_servicios)})
            input.end()
        } catch (error) {
            console.error('Error en el servidor',error)
            res.status(500).send('yucas en el server')
        }
    })


    app.post('/guardar-servicios-usuario',async(req,res)=>{
        const input = await mysql.createConnection(db)
        const {servicios,fechahora} = req.body
        const nombreusario= req.session.usuario
        const Doc = req.session.documento
        console.log(nombreusario,Doc)
        /* const{usuario,servicios,fechahora}=req.body;
        const usuarioArray=usuario.split(",")
        console.log("documento",usuarioArray[1])
        const input=await mysql.createConnection(db) */
        
        try {
            for(const servicio of servicios){
                const [consulid]= await input.execute('SELECT id_usuarios FROM usuarios WHERE documento= ?',[Doc])
                 console.log(consulid)
                const [consulService] = await input.query('SELECT servicios.ud_servicios FROM servicios WHERE servicios.nombre_servicios= ?',[servicios])
                console.log(consulService)
                await input.execute('INSERT INTO solicitudes (solicitudes_usuarios, fecha, codigoS) VALUES (?,?,?)',
                [consulid[0].id_usuarios,fechahora,consulService[0].ud_servicios])
                console.log("Datos han sido enviados")
                res.status(200).send('servicios guardados') 
            }
          await  input.end()
        } catch (error) {
            console.error('Error en el servidor',error)
            res.status(500).send('yucas en el server')
        }
      await  input.end()
    })

    app.post('/recibir-solicitudes',async(req, res)=>{
        const nombreusario= req.session.usuario
        const Doc = req.session.documento
        console.log(nombreusario,Doc)
     try {
        const input=await mysql.createConnection(db);
        const[reciData]=await input.execute('SELECT solicitudes.id_solicitud, servicios.nombre_servicios, solicitudes.fecha FROM solicitudes INNER JOIN usuarios ON solicitudes.solicitudes_usuarios = usuarios.id_usuarios INNER JOIN manzanas ON usuarios.id_m2 = manzanas.id_m INNER JOIN m_s ON manzanas.id_m = m_s.id_m1 INNER JOIN servicios ON m_s.id_s1 = servicios.ud_servicios WHERE usuarios.documento = ? AND solicitudes.codigoS = servicios.ud_servicios', [Doc])   
        console.log(reciData)
        res.json({
            solicitudes: reciData.map(row =>([
              row.id_solicitud,
              row.nombre_servicios,
              row.fecha,
              row.tipo  
            ]))
        })
    await input.end()
     } catch (error){
        console.error('Error en el servidor',error)
        res.status(500).send('yucas el server')
     }  
  })



   app.delete('/eliminar_solicitud', async (req, res)=>{
        const {id_sol} = req.body
        const input=await mysql.createConnection(db);
        try{
            await input.execute('DELETE FROM solicitudes WHERE id_solicitud = ?',[id_sol]);
            res.status(200).send(`<script>
            window.onload=function(){
                alert('solicitud eliminada');
                window.location.href='http://127.0.0.1:5500/vista/html/usuario.html';
            }
            </script
            `)
        }catch(error){
            console.error('Error en el servidor', error)
            res.status(500).send('reinicie el server')
        }
    }) 


//==================ADMINISTRADOR==================================
//==================REGISTRO DE MANZANAS===========================
//GUARDAR REGISTRO DE MANZANAS
    app.post('/Registro-Manzanas', async (req,res)=>{
        const {Nombre_M, Direccion_M} = req.body;
            try{
                 const input=await mysql.createConnection(db);
                 const Indicador = await input.execute('SELECT * FROM manzanas WHERE manzanas.nombre_manzana = ? AND manzanas.direccion = ?',[Nombre_M,Direccion_M]);
            if(Indicador.length === 0){
                 // No existe una manzana con el nombre y la dirección especificados
                res.status(401).send('<script>window.location{alert("Manzana ya esta registrada");}</script>');
            }
            else{
                 // Ya existe una manzana con el nombre y la dirección especificados
                await input.execute('INSERT INTO manzanas(nombre_manzana,direccion) VALUES(?,?)',[Nombre_M,Direccion_M]);
                res.status(201).send('<script>window.onload=function(){alert("Dato registrado");}</script>');
            }
            await input.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitrar Manzana');
        }
    });

//OBTENER MANZANAS REGISTARDAS
    app.post('/obtener-manzanas', async (req,res)=>{
        const input=await mysql.createConnection(db);
        try{
            const [indicador] = await input.execute('SELECT * FROM manzanas');
            console.log(indicador)
            res.json({
                manzanasr: indicador.map(row =>([
                row.id_m,
                row.nombre_manzana,
                row.direccion,
                ]))
            })
        await input.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitrar Manzana');
        }
    })
 //Actualizar las manzanas Editadas
 app.post('/Actualizar-Manzanas', async (req, res)=>{
    const input = await mysql.createConnection(db)
    const {Nombre_M, Direccion_M, id_m} = req.body;
    
    try{
        await input.execute('UPDATE manzanas SET nombre_manzana=?, direccion=? WHERE id_m=?', [Nombre_M, Direccion_M,id_m])
        res.status(200).send(`<script> 
                alert('Manzana Actualizada');
                </script>`)
    }catch (error) { 
        //Capturamos el error.
        console.error('Error en el servidor', error)
        res.status(500).send('Reinicie el servidor')
    }
}) 
//==================REGISTRO DE SERVICIOS===========================
// Suponiendo que las columnas de tu tabla están en el orden 'nombre_servicios', 'tipo'
  
 app.post('/Registro-Servicios', async (req,res)=>{
        const input=await mysql.createConnection(db);
        const {nombre_server,tipo_server} = req.body;
            try{
                const Indica = await input.execute('SELECT * FROM servicios WHERE servicios.nombre_servicios = ? AND servicios.tipo = ?',[nombre_server,tipo_server]);
            if(Indica.length === 0){
                 // No existe una manzana con el nombre y la dirección especificados
                res.status(401).send('<script>window.onload=function(){alert("Servicio ya Registrado");}</script>');
            }
            else{
                 // Ya existe una manzana con el nombre y la dirección especificados
                await input.execute('INSERT INTO servicios(nombre_servicios,tipo) VALUES(?,?)',[nombre_server,tipo_server]);
                res.status(201).send('<script>window.onload=function(){alert("Dato registrado");}</script>');
            }
            await input.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitrar Manzana');
        }
    });  

    //OBTENER SERVICIOS REGISTRADOS
    app.post('/obtener-Servicios', async (req,res)=>{
        const input=await mysql.createConnection(db);
        try{
            const [indica] = await input.execute('SELECT * FROM servicios');
            console.log(indica)
            res.json({
                manzanasr: indica.map(row =>([
                row.ud_servicios,
                row.nombre_servicios,
                row.tipo
                ]))
            })
        await input.end();
        }
        catch(error){
            console.error('Hubo un error con el servidor: ',error);
            res.status(500).send('Erro en el regitrar Servicio');
        }
    })

    //Actualizar los Servicios Editadas
 app.post('/Actualizar-Servicios', async (req, res)=>{
    const input = await mysql.createConnection(db)
    const {nombre_server,tipo_server,id_server} = req.body;
    try{
        await input.execute('UPDATE servicios SET nombre_servicios = ?, tipo = ? WHERE ud_servicios = ?;', [nombre_server,tipo_server,id_server])
        res.status(200).send(`<script> 
        window.location.href='http://127.0.0.1:5500/vista/html/index.html'
                alert('Servicio Actualizado');
                </script>`)
    }catch (error) { 
        //Capturamos el error.
        console.error('Error en el servidor', error)
        res.status(500).send('Reinicie el servidor')
    }
}) 

//Eliminar los servicios 
app.delete('/eliminar_servicio', async (req, res)=>{
    const {indicam} = req.body
    const input=await mysql.createConnection(db);
    try{
        await input.execute('DELETE FROM servicios WHERE ud_servicios = ?',[indicam]);
        res.status(200).send(`<script> 
        window.location.href='http://127.0.0.1:5500/vista/html/index.html'
        alert('Servicio eliminado');
        </script>
        `)
    }catch(error){
        console.error('Error en el servidor', error)
        res.status(500).send('reinicie el server')
    }
}) 
//=================================Usuarios Registrados==============================
/* app.post('/Registro-Usuarios', async (req,res)=>{
    const input=await mysql.createConnection(db);
    const {nombre_user,tipo_doc,document,id_usuer} = req.body;
        try{
            const Indicar = await input.execute('SELECT * FROM usuarios WHERE usuarios.nombre_usuarios = ? AND usuarios.tipo_documento = ? AND usuarios.documento = ? AND id_usuarios',[nombre_user,tipo_doc,document,id_usuer]);
        if(Indicar.length === 0){
            res.status(401).send('<script>window.onload=function(){alert("Servicio ya Registrado");}</script>');
        }
        else{
            await input.execute('INSERT INTO usuarios(nombre_usuarios,tipo_documento,documento,id_usuarios) VALUES(?,?,?,?)',[nombre_user,tipo_doc,document,id_usuer]);
            res.status(201).send('<script>window.onload=function(){alert("Dato registrado");}</script>');
        }
        await input.end();
    }
    catch(error){
        console.error('Hubo un error con el servidor: ',error);
        res.status(500).send('Erro en el regitrar Manzana');
    }
});  
 */
/* app.delete('/eliminar_user', async (req, res)=>{
    const {indicado} = req.body
    const input=await mysql.createConnection(db);
    try{
        await input.execute('DELETE FROM servicios WHERE ud_servicios = ?',[indicado]);
        res.status(200).send(`<script> 
        alert('Servicio eliminado');
        </script>
        `)
    }catch(error){
        console.error('Error en el servidor', error)
        res.status(500).send('reinicie el server')
    }
})  */
//Obtener usuarios
app.post('/obtener-User', async (req,res)=>{
    const input=await mysql.createConnection(db);
    try{
        const [indicar] = await input.execute('SELECT usuarios.id_usuarios, usuarios.nombre_usuarios, usuarios.tipo_documento, usuarios.documento, manzanas.nombre_manzana from usuarios INNER JOIN manzanas ON usuarios.id_m2=manzanas.id_m WHERE usuarios.id_m2=manzanas.id_m');
        console.log(indicar)
        res.json({
            manzanasr: indicar.map(row =>([
            row.id_usuarios,
            row.nombre_usuarios,
            row.tipo_documento,
            row.documento,
            row.name_manzana
            ]))
        })
    await input.end();
    }
    catch(error){
        console.error('Hubo un error con el servidor: ',error);
        res.status(500).send('Erro en el regitrar Servicio');
    }
})

//Actualizar User
app.post('/Actualizar-User', async (req, res)=>{
    const input = await mysql.createConnection(db)
    const {id_usuarios,nombre_usuarios,tipo_documento,documento,name_manzana} = req.body;
    try{
        await input.execute('UPDATE usuarios INNER JOIN manzanas ON usuarios.id_m2 = manzanas.id_m SET usuarios.nombre_usuarios = ?, usuarios.tipo_documento = ?, usuarios.documento = ?, manzanas.nombre_manzana = ? WHERE usuarios.id_usuarios = ? AND manzanas.id_m = ?', [id_usuarios,nombre_usuarios,tipo_documento,documento,name_manzana])
        res.status(200).send(`<script> 
                alert('Servicio Actualizado');
                </script>`)
    }catch (error) { 
        //Capturamos el error.
        console.error('Error en el servidor', error)
        res.status(500).send('Reinicie el servidor')
    }
}) 


//Cerrar Sesion Admin
app.post('/logOut', (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error('Error',err)
            res.status(500).send("Error al cerrar session")
        }
        else{
            res.status(200).send('sesion ha sido cerrada')
        }
    })
})

//Cerrar sesion Usuario
app.post('/log-out', (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error('Error',err)
            res.status(500).send("Error al cerrar session")
        }
        else{
            res.status(200).send('sesion ha sido cerrada')
        }
    })
})
    
    app.listen(3000,()=>{
        console.log('servidor node.js escuchando')
    })


   