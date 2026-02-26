import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Dashboard"),
        backgroundColor: Colors.blue[800],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, size: 80, color: Colors.green),
            SizedBox(height: 16),
            Text("Login Successful!", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            Text("Session stored locally.", style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
